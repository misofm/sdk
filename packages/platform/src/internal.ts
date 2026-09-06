// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Internal shared helpers (deliberately NOT exported from the package root).
//
// PTB building blocks — the `0x1::option` move-call targets used when a generated
// call needs an `Option` argument built inline. Consumed by `./cover` and
// `./credits`.
//
// These came over from `@misonetwork/sdk`'s own private `internal.ts` when the
// extension surface moved here. They were NOT promoted to that package's public
// API to make them reachable: they are two literal Move function targets from the
// standard library, so re-deriving them costs nothing, whereas exporting them
// would widen the protocol SDK's public surface — and therefore its compatibility
// promise — for no benefit.

/** `0x1::option::none` / `0x1::option::some` moveCall targets. */
export const OPTION_NONE = "0x1::option::none";
export const OPTION_SOME = "0x1::option::some";

/**
 * Clone arrays and plain records recursively, then freeze the clone.
 *
 * Registration inputs are data-only configuration records. Snapshotting them
 * prevents later caller mutation without freezing or otherwise taking
 * ownership of the caller's original objects. Non-plain objects are preserved
 * by reference so this helper never attempts to clone SDK clients or signers.
 */
export function immutableSnapshot<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => immutableSnapshot(item))) as T;
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          immutableSnapshot(item),
        ]),
      ),
    ) as T;
  }
  return value;
}
