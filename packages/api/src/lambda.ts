import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoFuseRepository } from "@fuse/persistence";
import { createFuseApi, type FuseApi } from "./app.js";
import { createEventBridgePublisher } from "./eventbridge.js";
import type { HttpRequest } from "./types.js";

export interface HttpApiV2Event {
  rawPath?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
    };
  };
}

export interface HttpApiV2Result {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

let cachedApi: FuseApi | undefined;

export function createLambdaHandler(api: FuseApi) {
  return async function handler(event: HttpApiV2Event): Promise<HttpApiV2Result> {
    const method = event.requestContext?.http?.method ?? "GET";
    const path = event.rawPath ?? event.requestContext?.http?.path ?? "/";
    let body = event.body ?? undefined;
    if (body !== undefined && event.isBase64Encoded === true) {
      body = Buffer.from(body, "base64").toString("utf8");
    }
    const request: HttpRequest = {
      method,
      path,
      headers: event.headers ?? {},
      body,
    };
    const result = await api.handle(request);
    return {
      statusCode: result.statusCode,
      headers: result.headers,
      body: result.body,
    };
  };
}

export function resolveApiFromEnv(env: NodeJS.ProcessEnv = process.env): FuseApi {
  const runsTable = env.FUSE_RUNS_TABLE;
  const eventsTable = env.FUSE_EVENTS_TABLE;
  const busName = env.FUSE_EVENT_BUS_NAME;
  if (
    runsTable !== undefined &&
    runsTable !== "" &&
    eventsTable !== undefined &&
    eventsTable !== ""
  ) {
    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
    const repository = new DynamoFuseRepository({
      docClient,
      runsTable,
      eventsTable,
    });
    const publishBreakerTripped =
      busName !== undefined && busName !== ""
        ? createEventBridgePublisher(new EventBridgeClient({}), busName)
        : undefined;
    return createFuseApi({ repository, publishBreakerTripped });
  }
  return createFuseApi();
}

function getApi(): FuseApi {
  cachedApi ??= resolveApiFromEnv();
  return cachedApi;
}

export const handler = createLambdaHandler({
  handle: (request) => getApi().handle(request),
});
