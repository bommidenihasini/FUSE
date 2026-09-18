import { randomUUID } from "node:crypto";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Event, Policy, Run } from "@fuse/contracts";
import {
  assertAllowedTransition,
  DuplicateEventError,
  DuplicateRunError,
  InvalidTransitionError,
  RunNotFoundError,
  RunNotRunningError,
  TerminalRunError,
} from "./errors.js";
import { assertMutable, clonePolicy, publicRun, type StoredRun } from "./mapping.js";
import { sanitizeMetadata } from "./sanitize.js";
import type {
  AppendEventInput,
  CreateRunInput,
  FuseRepository,
  RunCounterPatch,
  TransitionRunInput,
} from "./types.js";

export interface DynamoFuseRepositoryOptions {
  docClient: DynamoDBDocumentClient;
  runsTable: string;
  eventsTable: string;
  createId?: () => string;
}

export class DynamoFuseRepository implements FuseRepository {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly runsTable: string;
  private readonly eventsTable: string;
  private readonly createId: () => string;

  constructor(options: DynamoFuseRepositoryOptions) {
    this.docClient = options.docClient;
    this.runsTable = options.runsTable;
    this.eventsTable = options.eventsTable;
    this.createId = options.createId ?? randomUUID;
  }

  async createRun(input: CreateRunInput): Promise<Run> {
    const runId = this.createId();
    const item: StoredRun = {
      runId,
      scenario: input.scenario,
      status: "CREATED",
      policySnapshot: clonePolicy(input.policySnapshot),
      stepCount: 0,
      modelCallCount: 0,
      toolCallCount: 0,
      retryCount: 0,
      estimatedCostUsd: 0,
      startedAt: input.createdAt,
      nextEventSequence: 1,
    };
    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.runsTable,
          Item: item,
          ConditionExpression: "attribute_not_exists(runId)",
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new DuplicateRunError(runId);
      }
      throw error;
    }
    return publicRun(item);
  }

  async getRun(runId: string): Promise<Run | undefined> {
    const stored = await this.load(runId);
    return stored === undefined ? undefined : publicRun(stored);
  }

  async getPolicySnapshot(runId: string): Promise<Policy> {
    const stored = await this.require(runId);
    return clonePolicy(stored.policySnapshot);
  }

  async updateRunCounters(runId: string, counters: RunCounterPatch): Promise<Run> {
    try {
      const result = await this.docClient.send(
        new UpdateCommand({
          TableName: this.runsTable,
          Key: { runId },
          UpdateExpression:
            "SET stepCount = :stepCount, modelCallCount = :modelCallCount, toolCallCount = :toolCallCount, retryCount = :retryCount, estimatedCostUsd = :estimatedCostUsd",
          ConditionExpression: "#status = :running",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":running": "RUNNING",
            ":stepCount": counters.stepCount,
            ":modelCallCount": counters.modelCallCount,
            ":toolCallCount": counters.toolCallCount,
            ":retryCount": counters.retryCount,
            ":estimatedCostUsd": counters.estimatedCostUsd,
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      return publicRun(asStoredRun(result.Attributes as Record<string, unknown>));
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        const stored = await this.require(runId);
        if (stored.status !== "RUNNING") {
          throw stored.status === "CREATED"
            ? new RunNotRunningError(runId)
            : new TerminalRunError(runId);
        }
      }
      throw error;
    }
  }

  async transitionRunState(input: TransitionRunInput): Promise<Run> {
    const current = await this.require(input.runId);
    assertAllowedTransition(current.status, input.to);
    const names: Record<string, string> = { "#status": "status" };
    const values: Record<string, unknown> = {
      ":from": current.status,
      ":to": input.to,
    };
    let update = "SET #status = :to";
    if (input.to === "RUNNING") {
      update += ", startedAt = :at";
      values[":at"] = input.at;
    } else {
      update += ", endedAt = :at";
      values[":at"] = input.at;
    }
    if (input.breakerReason !== undefined) {
      update += ", breakerReason = :breakerReason";
      values[":breakerReason"] = input.breakerReason;
    }
    if (input.breakerReasonCode !== undefined) {
      update += ", breakerReasonCode = :breakerReasonCode";
      values[":breakerReasonCode"] = input.breakerReasonCode;
    }
    try {
      const result = await this.docClient.send(
        new UpdateCommand({
          TableName: this.runsTable,
          Key: { runId: input.runId },
          UpdateExpression: update,
          ConditionExpression: "#status = :from",
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        }),
      );
      return publicRun(asStoredRun(result.Attributes as Record<string, unknown>));
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        const latest = await this.require(input.runId);
        throw new InvalidTransitionError(latest.status, input.to);
      }
      throw error;
    }
  }

  async appendEvent(runId: string, event: AppendEventInput): Promise<Event> {
    const stored = await this.require(runId);
    assertMutable(stored);
    const sequence = stored.nextEventSequence;
    const item: Event = {
      runId,
      sequence,
      type: event.type,
      timestamp: event.timestamp,
    };
    if (event.kind !== undefined) {
      item.kind = event.kind;
    }
    if (event.name !== undefined) {
      item.name = event.name;
    }
    if (event.stableSignature !== undefined) {
      item.stableSignature = event.stableSignature;
    }
    if (event.allowed !== undefined) {
      item.allowed = event.allowed;
    }
    if (event.reasonCode !== undefined) {
      item.reasonCode = event.reasonCode;
    }
    if (event.reason !== undefined) {
      item.reason = event.reason;
    }
    if (event.estimatedCostUsd !== undefined) {
      item.estimatedCostUsd = event.estimatedCostUsd;
    }
    const metadata = sanitizeMetadata(event.metadata);
    if (metadata !== undefined) {
      item.metadata = metadata;
    }
    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.eventsTable,
          Item: item,
          ConditionExpression: "attribute_not_exists(runId)",
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new DuplicateEventError(runId, sequence);
      }
      throw error;
    }
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.runsTable,
        Key: { runId },
        UpdateExpression: "SET nextEventSequence = :next",
        ConditionExpression: "nextEventSequence = :seq",
        ExpressionAttributeValues: {
          ":next": sequence + 1,
          ":seq": sequence,
        },
      }),
    );
    return item;
  }

  async listEvents(runId: string): Promise<Event[]> {
    await this.require(runId);
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.eventsTable,
        KeyConditionExpression: "runId = :runId",
        ExpressionAttributeValues: { ":runId": runId },
        ScanIndexForward: true,
      }),
    );
    return (result.Items ?? []).map((row) => asEvent(row as Record<string, unknown>));
  }

  private async load(runId: string): Promise<StoredRun | undefined> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.runsTable,
        Key: { runId },
      }),
    );
    if (result.Item === undefined) {
      return undefined;
    }
    return asStoredRun(result.Item as Record<string, unknown>);
  }

  private async require(runId: string): Promise<StoredRun> {
    const stored = await this.load(runId);
    if (stored === undefined) {
      throw new RunNotFoundError(runId);
    }
    return stored;
  }
}

function asStoredRun(item: Record<string, unknown> | undefined): StoredRun {
  if (item === undefined) {
    throw new Error("Missing DynamoDB run item");
  }
  return item as unknown as StoredRun;
}

function asEvent(item: Record<string, unknown>): Event {
  return item as unknown as Event;
}
