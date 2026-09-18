import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

type Item = Record<string, unknown>;

export class FakeDocumentClient {
  readonly runs = new Map<string, Item>();
  readonly events = new Map<string, Item>();

  constructor(
    private readonly runsTable: string,
    private readonly eventsTable: string,
  ) {}

  async send(
    command: PutCommand | GetCommand | UpdateCommand | QueryCommand,
  ): Promise<{ Item?: Item; Items?: Item[]; Attributes?: Item }> {
    if (command instanceof PutCommand) {
      return this.put(command);
    }
    if (command instanceof GetCommand) {
      return this.get(command);
    }
    if (command instanceof UpdateCommand) {
      return this.update(command);
    }
    if (command instanceof QueryCommand) {
      return this.query(command);
    }
    throw new Error("Unsupported fake DynamoDB command");
  }

  private put(command: PutCommand): object {
    const table = command.input.TableName;
    const item = { ...(command.input.Item as Item) };
    const runId = String(item["runId"]);
    if (command.input.ConditionExpression === "attribute_not_exists(runId)") {
      if (table === this.runsTable && this.runs.has(runId)) {
        throw new ConditionalCheckFailedException({ message: "run exists", $metadata: {} });
      }
      if (table === this.eventsTable) {
        const sequence = Number(item["sequence"]);
        if (this.events.has(eventKey(runId, sequence))) {
          throw new ConditionalCheckFailedException({ message: "event exists", $metadata: {} });
        }
      }
    }
    if (table === this.runsTable) {
      this.runs.set(runId, item);
    } else {
      this.events.set(eventKey(runId, Number(item["sequence"])), item);
    }
    return {};
  }

  private get(command: GetCommand): { Item?: Item } {
    const runId = String((command.input.Key as Item)["runId"]);
    return { Item: this.runs.get(runId) };
  }

  private update(command: UpdateCommand): { Attributes?: Item } {
    const runId = String((command.input.Key as Item)["runId"]);
    const current = this.runs.get(runId);
    if (current === undefined) {
      throw new ConditionalCheckFailedException({ message: "missing", $metadata: {} });
    }
    const names = command.input.ExpressionAttributeNames ?? {};
    const values = (command.input.ExpressionAttributeValues ?? {}) as Item;
    if (!matchesCondition(current, command.input.ConditionExpression, names, values)) {
      throw new ConditionalCheckFailedException({ message: "condition", $metadata: {} });
    }
    applySet(current, command.input.UpdateExpression, names, values);
    this.runs.set(runId, current);
    return { Attributes: { ...current } };
  }

  private query(command: QueryCommand): { Items: Item[] } {
    const runId = String((command.input.ExpressionAttributeValues as Item)[":runId"]);
    const items = [...this.events.values()].filter((item) => item["runId"] === runId);
    items.sort((a, b) => Number(a["sequence"]) - Number(b["sequence"]));
    if (command.input.ScanIndexForward === false) {
      items.reverse();
    }
    return { Items: items };
  }
}

function eventKey(runId: string, sequence: number): string {
  return `${runId}#${String(sequence)}`;
}

function resolveName(token: string, names: Record<string, string>): string {
  const trimmed = token.trim();
  if (trimmed.startsWith("#")) {
    return names[trimmed] ?? trimmed.slice(1);
  }
  return trimmed;
}

function matchesCondition(
  item: Item,
  expression: string | undefined,
  names: Record<string, string>,
  values: Item,
): boolean {
  if (expression === undefined) {
    return true;
  }
  const eq = /^(#[A-Za-z]+|[A-Za-z]+) = (:[A-Za-z]+)$/.exec(expression.trim());
  if (eq !== null && eq[1] !== undefined && eq[2] !== undefined) {
    const field = resolveName(eq[1], names);
    return item[field] === values[eq[2]];
  }
  return false;
}

function applySet(
  item: Item,
  expression: string | undefined,
  names: Record<string, string>,
  values: Item,
): void {
  if (expression === undefined || !expression.startsWith("SET ")) {
    return;
  }
  const assigns = expression.slice(4).split(",");
  for (const assign of assigns) {
    const [rawName, rawValue] = assign.split("=");
    if (rawName === undefined || rawValue === undefined) {
      continue;
    }
    item[resolveName(rawName, names)] = values[rawValue.trim()];
  }
}
