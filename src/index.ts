// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// `@misofm/sdk` — the PLATFORM layer.
//
// Miso's own product sits on top of the permissionless protocol, and the two
// have different names on npm because they have different promises:
//
//   @misonetwork/*  PROTOCOL — Composition, Recording, Release. The open layer
//                   anyone can build on, and nobody needs Miso's permission to use.
//   @misofm/*       PLATFORM — Pressing, Listing, Record, and the first-party
//                   EXTENSIONS. How MISO sells copies of a release, and the
//                   opinions it attaches to a work along the way.
//
// A release is protocol. Pressing a record off it and selling that record is
// platform. Keeping the split at the package boundary is what stops the protocol
// from quietly growing a storefront. Core's `release::new` is the sole practical
// exception: it needs `&mut UID`, which cannot cross a PTB command boundary, so
// the platform's `release_registry` extension owns the PTB-callable minting path.
//
// Extensions live on this side of the line for the same reason. An extension is
// not part of what a Composition or Recording IS — it is a choice Miso makes
// about how to describe one (who gets credited and in what vocabulary, what the
// cover looks like, whether royalties accumulate in a pool). The protocol gives
// extensions a `&mut UID` hook and stops there; every opinion about what to hang
// off it is business logic, and business logic ships from the platform package.

// The recommended entry point is the client extension (see ./client.ts); the bare
// builders and readers stay exported for callers that hold ids themselves.
export { miso, misoPlatform, MisoClient, MisoPlatformClient } from "./client.ts";
export type { MisoOptions, MisoPlatformConfig } from "./client.ts";
export * from "./deployments.ts";
export * from "./pressing.ts";
export * from "./transactions.ts";
export * from "./execute.ts";
export * from "./share.ts";
export * from "./share-template.ts";
export * from "./release-graph.ts";
export * from "./catalog.ts";

// High-level, JSON-safe platform projections used directly by clients and by
// the thin HTTP read service. Namespaced because these composed view types are
// intentionally distinct from the lower-level contract views above.
export * as read from "./read/index.ts";

// First-party extensions — attached to a protocol work via its cap-gated
// `uid_mut` hook.
export * from "./credits.ts";
export * from "./cover.ts";
export * from "./extensions/royalty-pool.ts";

// Generated, ABI-bound bindings (BCS structs + type-safe Move calls).
export * as contracts from "./contracts.ts";
