// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Barrel for the codegen-generated, ABI-bound bindings (BCS structs + type-safe
// Move calls). Re-exported from the package root as the `contracts` namespace.
//
// PLATFORM + EXTENSION packages. The protocol core (`miso`: Composition,
// Recording, Release, Deal, Track) generates into `@misonetwork/sdk` and is
// re-exported from ITS `contracts` namespace — import it from there rather than
// mirroring it here.

// The record production line (pressing runs + their per-currency listings).
export * as pressing from "./contracts/miso_pressing/pressing.ts";
export * as listing from "./contracts/miso_pressing/listing.ts";
export * as certificate from "./contracts/miso_pressing/certificate.ts";

// Royalty-pool extension (base lib + per-work extensions).
export * as royaltyPool from "./contracts/royalty_pool/pool.ts";
export * as royaltyPoolStake from "./contracts/royalty_pool/stake.ts";
export * as compositionRoyaltyPool from "./contracts/composition_royalty_pool/composition_royalty_pool.ts";
export * as recordingRoyaltyPool from "./contracts/recording_royalty_pool/recording_royalty_pool.ts";

// Cover art (the CoverArt value type + the release attachment extension).
export * as coverArt from "./contracts/cover_art/cover_art.ts";
export * as releaseCoverArt from "./contracts/release_cover_art/release_cover_art.ts";

// Credits extensions (per-work credit stores + their role vocabularies).
export * as compositionCredits from "./contracts/composition_credits/composition_credits.ts";
export * as compositionPartyRole from "./contracts/composition_credits/composition_party_role.ts";
export * as recordingCredits from "./contracts/recording_credits/recording_credits.ts";
export * as recordingPartyRole from "./contracts/recording_credits/recording_party_role.ts";
export * as releaseCredits from "./contracts/release_credits/release_credits.ts";
export * as releasePartyRole from "./contracts/release_credits/release_party_role.ts";
