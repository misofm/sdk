// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// `@misofm/sdk` — the PLATFORM layer.
//
// Miso's own product sits on top of the permissionless protocol, and the two
// have different names on npm because they have different promises:
//
//   @misonetwork/*  PROTOCOL — Composition, Recording, Release. The open layer
//                   anyone can build on, and nobody needs Miso's permission to use.
//   @misofm/*       PLATFORM — Pressing, Listing, Record. How MISO sells copies of
//                   a release: the production line, its currencies, and the record
//                   a buyer walks away with.
//
// A release is protocol. Pressing a record off it and selling that record is
// platform. Keeping the split at the package boundary is what stops the protocol
// from quietly growing a storefront.

// The recommended entry point is the client extension (see ./client.ts); the bare
// builders and readers stay exported for callers that hold ids themselves.
export { misoPlatform, MisoPlatformClient } from "./client.ts";
export type { MisoPlatformConfig } from "./client.ts";
export * from "./pressing.ts";
export type { TxThunk } from "./transactions.ts";
