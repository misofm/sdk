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
