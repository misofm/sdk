// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Barrel for the codegen-generated, ABI-bound bindings (BCS structs + type-safe
// Move calls). Re-exported from the package root as the `contracts` namespace.
//
// PLATFORM + EXTENSION packages. The protocol core (`miso`: Composition,
// Recording, Release, Track) generates into `@misonetwork/sdk` and is
// re-exported from ITS `contracts` namespace — import it from there rather than
// mirroring it here.

// The record production line (pressing runs + their per-currency listings).
export * as pressing from "./contracts/miso_pressing/pressing.ts";
export * as listing from "./contracts/miso_pressing/listing.ts";
export * as certificate from "./contracts/miso_pressing/certificate.ts";

// Generic royalty-pool primitive plus vault-custodied business-logic plugins.
export * as royaltyPool from "./contracts/royalty_pool/pool.ts";
export * as royaltyPoolStake from "./contracts/royalty_pool/stake.ts";
export * as vault from "./contracts/vault/vault.ts";
export * as compositionRoyaltyPool from "./contracts/composition_royalty_pool/composition_royalty_pool.ts";
export * as recordingRoyaltyPool from "./contracts/recording_royalty_pool/recording_royalty_pool.ts";
export * as partyWallet from "./contracts/party_wallet/party_wallet.ts";
export * as routedStake from "./contracts/routed_stake/routed_stake.ts";
export * as compositionRoutedStake from "./contracts/composition_routed_stake/composition_routed_stake.ts";

// Cover art (the CoverArt value type + the release attachment extension).
export * as coverArt from "./contracts/cover_art/cover_art.ts";
export * as releaseCoverArt from "./contracts/release_cover_art/release_cover_art.ts";

// Release presentation, discovery, buyer-content, and runtime economics.
export * as genre from "./contracts/genre/genre.ts";
export * as releaseDescription from "./contracts/release_description/release_description.ts";
export * as releaseDspLink from "./contracts/release_dsp_link/release_dsp_link.ts";
export * as releaseGenre from "./contracts/release_genre/release_genre.ts";
export * as releaseKind from "./contracts/release_kind/release_kind.ts";
export * as releaseRevenueDistributor from "./contracts/release_revenue_distributor/release_revenue_distributor.ts";
export * as recordingAdvisory from "./contracts/recording_advisory/recording_advisory.ts";
export * as recordingLanguage from "./contracts/recording_language/recording_language.ts";
export * as recordingMasterReference from "./contracts/recording_master_reference/recording_master_reference.ts";
export * as recordingPreview from "./contracts/recording_preview/recording_preview.ts";

// Credits extensions (per-work credit stores + their role vocabularies).
export * as compositionCredits from "./contracts/composition_credits/composition_credits.ts";
export * as compositionPartyRole from "./contracts/composition_credits/composition_party_role.ts";
export * as recordingCredits from "./contracts/recording_credits/recording_credits.ts";
export * as recordingPartyRole from "./contracts/recording_credits/recording_party_role.ts";
export * as releaseCredits from "./contracts/release_credits/release_credits.ts";
export * as releasePartyRole from "./contracts/release_credits/release_party_role.ts";
