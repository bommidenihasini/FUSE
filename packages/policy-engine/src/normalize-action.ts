import { stableStringify } from "./stable-stringify.js";

const SENSITIVE_KEY_PATTERN =
  /^(prompt|system|systemprompt|messages|authorization|auth|apikey|api_key|secret|password|passwd|token|accesstoken|refreshtoken|credential|credentials|privatekey|session)$/i;

const REDACTED = "<redacted>";

export class InvalidActionNameError extends Error {
  readonly code = "INVALID_ACTION_NAME" as const;

  constructor() {
    super("Action name must be a non-empty string");
    this.name = "InvalidActionNameError";
  }
}

function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    const nested = record[key];
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(nested);
  }
  return out;
}

export function normalizeAction(name: string, args: unknown): string {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new InvalidActionNameError();
  }
  return `${name}:${stableStringify(redact(args))}`;
}
