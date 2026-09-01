// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "bun:test";
import { gte, int, ms, msOrNull, u64, u64OrNull } from "../../src/read/internal/scalars.ts";

describe("u64", () => {
  test("passes bigints through as decimal strings without precision loss", () => {
    // Beyond Number.MAX_SAFE_INTEGER — the whole reason these are strings.
    expect(u64(18_446_744_073_709_551_615n)).toBe("18446744073709551615");
  });

  test("accepts the three shapes a u64 arrives in", () => {
    expect(u64(42n)).toBe("42");
    expect(u64(42)).toBe("42");
    expect(u64("42")).toBe("42");
  });

  test("normalizes leading zeros and surrounding whitespace", () => {
    expect(u64("  007 ")).toBe("7");
  });

  test("defaults unreadable input to zero", () => {
    expect(u64(null)).toBe("0");
    expect(u64(undefined)).toBe("0");
    expect(u64("not-a-number")).toBe("0");
    expect(u64(Number.NaN)).toBe("0");
  });

  test("u64OrNull keeps absent distinguishable from zero", () => {
    expect(u64OrNull(null)).toBeNull();
    expect(u64OrNull(0n)).toBe("0");
    expect(u64OrNull("nope")).toBeNull();
  });

  test("rejects negative and precision-losing numeric values", () => {
    expect(u64OrNull(-1)).toBeNull();
    expect(u64OrNull(-1n)).toBeNull();
    expect(u64OrNull(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
  });
});

describe("ms", () => {
  test("returns milliseconds as a number", () => {
    expect(ms(1_784_469_818_440n)).toBe(1_784_469_818_440);
    expect(new Date(ms(1_784_469_818_440n)).getUTCFullYear()).toBe(2026);
  });

  test("absent timestamps are null, not the epoch, when nullability matters", () => {
    expect(msOrNull(null)).toBeNull();
    expect(ms(null)).toBe(0);
  });

  test("refuses a value that would lose precision as a Number", () => {
    expect(msOrNull((BigInt(Number.MAX_SAFE_INTEGER) + 10n).toString())).toBeNull();
  });
});

describe("int", () => {
  test("coerces the shapes bps and counts arrive in", () => {
    expect(int(3500)).toBe(3500);
    expect(int(3500n)).toBe(3500);
    expect(int("3500")).toBe(3500);
    expect(int(null)).toBe(0);
  });
});

describe("gte", () => {
  test("compares beyond Number precision", () => {
    const big = "18446744073709551615";
    const bigMinusOne = "18446744073709551614";
    expect(gte(big, bigMinusOne)).toBe(true);
    expect(gte(bigMinusOne, big)).toBe(false);
    // Both of these are the same f64; only BigInt comparison gets this right.
    expect(Number(big) >= Number(bigMinusOne)).toBe(true);
  });
});
