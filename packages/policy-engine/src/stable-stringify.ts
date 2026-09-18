export class UnsupportedSignatureValueError extends Error {
  readonly code = "UNSUPPORTED_SIGNATURE_VALUE" as const;

  constructor(readonly valueKind: string) {
    super(`Unsupported value for stable stringify: ${valueKind}`);
    this.name = "UnsupportedSignatureValueError";
  }
}

const MAX_DEPTH = 32;
const MAX_STRING_CHARS = 8192;

function kindOf(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return "NaN";
    }
    if (!Number.isFinite(value)) {
      return "non-finite-number";
    }
    return "number";
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return "array";
    }
    const tag = Object.prototype.toString.call(value);
    return tag.slice(8, -1);
  }
  return typeof value;
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function stringifyUnknown(value: unknown, depth: number): string {
  if (depth > MAX_DEPTH) {
    throw new UnsupportedSignatureValueError("max-depth-exceeded");
  }
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "string":
      if (value.length > MAX_STRING_CHARS) {
        throw new UnsupportedSignatureValueError("oversized-string");
      }
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new UnsupportedSignatureValueError(kindOf(value));
      }
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        const items = value.map((item, index) => {
          if (item === undefined || !(index in value)) {
            throw new UnsupportedSignatureValueError("sparse-or-undefined-array-item");
          }
          return stringifyUnknown(item, depth + 1);
        });
        return `[${items.join(",")}]`;
      }
      if (!isPlainObject(value)) {
        throw new UnsupportedSignatureValueError(kindOf(value));
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      const fields = keys.map((key) => {
        const nested = record[key];
        if (nested === undefined) {
          throw new UnsupportedSignatureValueError("undefined");
        }
        return `${JSON.stringify(key)}:${stringifyUnknown(nested, depth + 1)}`;
      });
      return `{${fields.join(",")}}`;
    }
    default:
      throw new UnsupportedSignatureValueError(kindOf(value));
  }
}

export function stableStringify(value: unknown): string {
  return stringifyUnknown(value, 0);
}
