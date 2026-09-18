import { describe, expect, test } from "vitest";
import { stableStringify, UnsupportedSignatureValueError } from "./stable-stringify.js";

describe("stableStringify", () => {
  test("primitive values", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(true)).toBe("true");
    expect(stableStringify(false)).toBe("false");
    expect(stableStringify(0)).toBe("0");
    expect(stableStringify(12.5)).toBe("12.5");
    expect(stableStringify("invoice")).toBe('"invoice"');
  });

  test("null values", () => {
    expect(stableStringify({ vendor: null })).toBe('{"vendor":null}');
    expect(stableStringify([null, "ok"])).toBe('[null,"ok"]');
  });

  test("nested objects with sorted keys", () => {
    expect(stableStringify({ b: { d: 1, c: 2 }, a: 0 })).toBe('{"a":0,"b":{"c":2,"d":1}}');
  });

  test("object keys in different orders are equivalent", () => {
    const left = stableStringify({ invoiceId: "INV-DEMO-001", amount: 1840.5 });
    const right = stableStringify({ amount: 1840.5, invoiceId: "INV-DEMO-001" });
    expect(left).toBe(right);
  });

  test("arrays preserve the same order", () => {
    expect(stableStringify(["a", "b"])).toBe('["a","b"]');
    expect(stableStringify(["a", "b"])).toBe(stableStringify(["a", "b"]));
  });

  test("arrays with different order are not equivalent", () => {
    expect(stableStringify(["a", "b"])).not.toBe(stableStringify(["b", "a"]));
  });

  test("unsupported values throw and are not coerced", () => {
    const unsupported: unknown[] = [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      1n,
      Symbol("x"),
      () => undefined,
      new Date("2026-09-18T00:00:00.000Z"),
      new Map(),
      new Set(),
      /fuse/,
    ];
    for (const value of unsupported) {
      expect(() => stableStringify(value)).toThrow(UnsupportedSignatureValueError);
    }
    expect(() => stableStringify({ a: undefined })).toThrow(UnsupportedSignatureValueError);
  });

  test("output is stable across repeated calls", () => {
    const value = { z: [1, { k: "v", j: false }], a: null };
    expect(stableStringify(value)).toBe(stableStringify(value));
    expect(stableStringify(value)).toBe('{"a":null,"z":[1,{"j":false,"k":"v"}]}');
  });

  test("large but bounded fixture arguments stringify", () => {
    const extra: Record<string, number> = {};
    for (let i = 0; i < 40; i += 1) {
      extra[`k${String(i).padStart(2, "0")}`] = i;
    }
    const value = {
      invoiceId: "INV-DEMO-001",
      vendor: "Northstar Supplies",
      amount: 1840.5,
      extra,
    };
    const once = stableStringify(value);
    const twice = stableStringify(value);
    expect(once).toBe(twice);
    expect(once.startsWith('{"amount":1840.5')).toBe(true);
    expect(once.includes('"invoiceId":"INV-DEMO-001"')).toBe(true);
  });
});
