// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// The bigint→JSON boundary. Every u64/u128 the protocol SDKs hand back arrives as
// a `bigint`, which `JSON.stringify` throws on; these convert once, here, so no
// view type can carry one out of the SDK (see the header of ../types.ts).

/** A u64/u128 as it may arrive off the wire, in BCS, or from a JSON projection. */
export type NumericLike = bigint | number | string | null | undefined;

/**
 * Base-unit scalar → decimal string. Returns `"0"` for anything unreadable, which
 * is the honest projection of "the chain gave us no number" for quantities and
 * amounts. Use {@link u64OrNull} where absent must stay distinguishable from zero.
 */
export function u64(v: NumericLike): string {
  return u64OrNull(v) ?? "0";
}

/** Base-unit scalar → decimal string, or `null` when absent/unparseable. */
export function u64OrNull(v: NumericLike): string | null {
  if (v == null) return null;
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return Number.isFinite(v) ? BigInt(Math.trunc(v)).toString() : null;
  const s = v.trim();
  return /^\d+$/.test(s) ? BigInt(s).toString() : null;
}

/**
 * A millisecond timestamp → `number`. Milliseconds stay numbers (they are far
 * inside Number.MAX_SAFE_INTEGER and `new Date()` wants one), unlike token
 * amounts which must not lose precision.
 */
export function msOrNull(v: NumericLike): number | null {
  const s = u64OrNull(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

/** As {@link msOrNull}, defaulting to `0` (the epoch) when absent. */
export function ms(v: NumericLike): number {
  return msOrNull(v) ?? 0;
}

/** A plain integer field (bps, edition, counts) → `number`, defaulting to `0`. */
export function int(v: NumericLike): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" && /^-?\d+$/.test(v.trim())) return Number(v.trim());
  return 0;
}

/** Integer comparison over two decimal strings — `a >= b` without going through Number. */
export function gte(a: string, b: string): boolean {
  return BigInt(a) >= BigInt(b);
}
