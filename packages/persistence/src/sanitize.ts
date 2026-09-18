const SENSITIVE_KEY_PATTERN =
  /^(prompt|system|systemprompt|messages|authorization|auth|apikey|api_key|secret|password|passwd|token|accesstoken|refreshtoken|credential|credentials|privatekey|session|arguments)$/i;

const REDACTED = "<redacted>";

export function sanitizeMetadata(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined;
  }
  return redact(value) as Record<string, unknown>;
}

function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    const nested = record[key];
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(nested);
  }
  return out;
}
