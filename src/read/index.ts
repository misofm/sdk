// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// @misofm/sdk/read — Miso's high-level platform read surface.
//
// One place that knows how to turn Sui objects into the things Miso talks about:
// a pressing, a release, an artist, a library, a receipt. It composes
// @misonetwork/miso-protocol and @misonetwork/miso-party, owns the per-network id
// manifest, and returns view types that survive JSON.
//
// Browser- and server-compatible. The HTTP API is a thin cached transport over
// this same surface; direct clients can use it without going through the API.
//
//   const miso = createMisoClient({ network: "testnet" })
//   const pressing = await getPressingDetail(miso, pressingId)

export { createMisoClient } from "./client.ts";
export type { MisoClient, CreateMisoClientOptions } from "./client.ts";

export { misoConfig, networkFrom } from "./config.ts";
export type { MisoConfig, MisoConfigOverrides, MoneyIds, Network, PartyIds, ProtocolIds } from "./config.ts";

export {
  currencyInfo,
  getDiscoverShelf,
  getDropPreview,
  getPressingDetail,
  getRecordAlbum,
  getReleaseDetail,
  getTrackCredits,
  primaryArtistNames,
  readReleaseCover,
} from "./catalog.ts";

export { getArtistProfile, getFeaturedRelease, getPartySummaries, partyAvatarUrl } from "./artist.ts";
export type { ArtistInclude, GetArtistOptions } from "./artist.ts";

export { resolveGenreNames } from "./genres.ts";

export {
  RECORD_TYPE_SUFFIX,
  getBalance,
  getOwnedParties,
  getOwnedRecords,
  getOwnedWorks,
  getWorkByCap,
  ownsParty,
  ownsRecord,
} from "./wallet.ts";

export { breakdown, getPurchaseReceipt } from "./receipts.ts";

export type * from "./types.ts";
