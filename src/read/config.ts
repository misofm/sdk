// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Per-network on-chain identity: which packages the reads address, which objects
// they read, and which endpoints they read through. Every id that used to be a
// hard-coded constant inside miso-app (`lib/party.ts`, `lib/release.ts`,
// `lib/money.ts`, `lib/drops.ts`) lives here instead, so a redeploy is a change
// in ONE file that every surface picks up.
//
// Testnet values are the deployed ones (verified against chain 2026-08-09).
// Mainnet is deliberately EMPTY: `misoConfig("mainnet")` throws rather than
// silently reading testnet ids on a mainnet deployment.

export type Network = "testnet" | "mainnet";

/** Anything but "mainnet" — including unset — is testnet. Mirrors miso-api's `networkFromEnv`. */
export function networkFrom(value: string | undefined): Network {
  return value === "mainnet" ? "mainnet" : "testnet";
}

/** Package ids for the miso protocol core and the extensions the read layer touches. */
export interface ProtocolIds {
  /** `miso` core — Composition / Recording / Release, and the origin of every derived admin cap. */
  miso: string;
  /** `miso_drop` — `drop::buy` and the `Drop` objects the pressing pages read. */
  drop: string;
  /** `miso_record` shared `Settings` object — the mint witness authorizer. */
  recordSettings: string;
  /** `release_cover_art` — the release cover extension currently written to. */
  releaseCoverArt: string;
  /**
   * Cover-art packages from before the `cover_art` package split. A cover set
   * under one of these is invisible to a current-package read, so cover reads
   * fall back through this list in order. Drop an entry once every cover it
   * holds has been re-set under `releaseCoverArt`.
   */
  legacyReleaseCoverArt: readonly string[];
  /** `composition_credits` / `recording_credits` / `release_credits` extensions. */
  compositionCredits: string;
  recordingCredits: string;
  releaseCredits: string;
  /** `miso_credit` — the shared `Credit<Role>` value type credits are built from. */
  credit: string;
}

/** Package ids for PartyOS core and every party extension the artist page reads. */
export interface PartyIds {
  partyPackageId: string;
  partyProfilePackageId: string;
  countryCodePackageId: string;
  languageCodePackageId: string;
  partyMediaPackageId: string;
  partyRolesPackageId: string;
  partyTagsPackageId: string;
  partyGenrePackageId: string;
  partyCtaPackageId: string;
  partyPlatformLinkPackageId: string;
  partySocialPackageId: string;
  partyMusicPackageId: string;
  partyProLinkPackageId: string;
  partyFeaturedDropPackageId: string;
  genrePackageId: string;
}

/** The currency the app prices records in, and where test dollars come from. */
export interface MoneyIds {
  /** Coin type balances, drops, and purchases are denominated in. */
  usdCoinType: string;
  usdDecimals: number;
}

export interface MisoConfig {
  network: Network;
  protocol: ProtocolIds;
  party: PartyIds;
  money: MoneyIds;
  /** Sui gRPC-web endpoint the data plane reads through. */
  grpcUrl: string;
  /**
   * Sui GraphQL RPC endpoint. Needed for the two things gRPC cannot answer:
   * "which object has type X" (share type → work id) and reading a transaction
   * the fullnode has already pruned.
   */
  graphqlUrl: string;
  /** Walrus aggregator serving cover art and party media for this network. */
  walrusAggregatorUrl: string;
  /**
   * Public origin of the Miso API, used to build avatar URLs (`/media/avatar/…`).
   * Avatars are an R2-backed API lane, not on-chain data, so the SDK needs the
   * public host to hand back a URL a browser can actually fetch.
   */
  apiBaseUrl: string;
  /** Releases the Discover shelf lists, in display order. Resolved to their live drop at read time. */
  discoverReleaseIds: readonly string[];
}

const TESTNET: MisoConfig = {
  network: "testnet",
  protocol: {
    miso: "0x648c9dfba8c800ebd5e608599551f51e1a157942e29d59a1c35e14c44367acf0",
    drop: "0xfc2b51f068dee9d5482d39fa017164f6a8c3601cabb59084a518de5f609ef1c7",
    recordSettings: "0xadf53b5be0d9eea43712b0c73d0ce55d1fb990ba06e35e12a9a371b2dfe3fd35",
    releaseCoverArt: "0x1ee2cae0da7595d7973c310c912434ef531589b468cc57839296810c1385f7f6",
    legacyReleaseCoverArt: ["0x7d4a205a68f8e768a408c9f4c45a4d4076722c5edeba9068c0ac058f554e964e"],
    compositionCredits: "0x25ba72b5737cac577ca8c92d0f1962efbe5d688a1088cfdc580740605086b366",
    recordingCredits: "0xd272b1960e5fae15ae2a5425b910a96619727c85acd0c0095b6089531fdb32a9",
    releaseCredits: "0xed764634b9c9a6af04e3c7f60f657c8e2129baf9b43fb9aee6f3523a423228e4",
    credit: "0x96c82da135bbd534850ca0a2445fdd2531dd4e0947ffa14645a2eb6636d83646",
  },
  party: {
    partyPackageId: "0xd1c0253f837c57bd0a572673a28374e32c118059356e0c9db26784897175197e",
    partyProfilePackageId: "0x6f8841bb252d3ba0f59f9027546be7a0e0a59d84757214df216eb14ef8a9719e",
    countryCodePackageId: "0x6c3a53f228ccd089825d0fb5ee1f0465a4b7a438bc1b1735b4e2f01df8d056e9",
    languageCodePackageId: "0xa18b786807cfc45488691f93aa647800b77cf9993e420d110afd7024c5b15948",
    partyMediaPackageId: "0xc04dbdc05076f642fa8dc79257de9d45ee71fc8fee4a4fe1c05c6bb27e8982ee",
    partyRolesPackageId: "0x18e6d59fe3a6496bd42273fd97e6e4b0ae7d3a8a876a6bbe4f6ae1b6057a6f38",
    partyTagsPackageId: "0x5a5ed50aac1146b34490949ab33fd29dc2ba13ddf1b8f90b4797e67e1301609d",
    partyGenrePackageId: "0x2d489291ce41392ae887e2e048f752a9bd6bea9f540b2c3d2356e36f0e624e29",
    partyCtaPackageId: "0xbf4b04afa5b9c87b7385c6a1f116165a6e3f9bed3e16ea064fed7be4da14db7f",
    partyPlatformLinkPackageId: "0x2bf95053493e640e3641abef2a9d6080ac563da62a5ca8e878e6d3459fdf27c8",
    partySocialPackageId: "0x24bdc5f4cdf68d5cbd6f2b4b791f8b0311060a7fac7e54c10d3a101aa7d6b56d",
    partyMusicPackageId: "0x40d8c48aa7cd8ade4ccfc7eb68de958403b08a897589934c191993b25961c453",
    partyProLinkPackageId: "0xe2f0160eeac627378538b82209c2cd58b6a73827dae46f5f92368a6c7e84ee8d",
    partyFeaturedDropPackageId: "0x5205a9f88702ed2dadd95e4d0096c691a40c96d8bb05d77127f1a62a6eb72cf7",
    genrePackageId: "0x7ee69a2f1440152ecdacad997364fb28fe1fc140fd720e4c6d37ad78e29a376d",
  },
  money: {
    usdCoinType: "0x77774cb7b8cb5622b4ef2658101bf5f1e965418297fe874b683df8f760b6e749::fakeusd::FakeUsd",
    usdDecimals: 6,
  },
  grpcUrl: "https://fullnode.testnet.sui.io",
  graphqlUrl: "https://graphql.testnet.sui.io/graphql",
  walrusAggregatorUrl: "https://aggregator.walrus-testnet.walrus.space",
  apiBaseUrl: "https://api.testnet.miso.fm",
  discoverReleaseIds: [
    // AMIANGELIKA — BLCK SUN
    "0xa16e7ef7af5104690117321c749995db1164db668a5559cf6a0706b26141c327",
    // Gateway Girl — Between the Doors
    "0x7144600de3bb037f23b9371a2bcd5c0d84a80abc381a9d03b00ff7e03f412623",
  ],
};

/** Fields a deployment may override without forking the whole config (endpoints, shelf). */
export type MisoConfigOverrides = Partial<
  Pick<MisoConfig, "grpcUrl" | "graphqlUrl" | "walrusAggregatorUrl" | "apiBaseUrl" | "discoverReleaseIds">
>;

/**
 * The config for `network`. Mainnet throws until its packages are deployed and
 * filled in here — a mainnet worker must fail loudly, never read testnet ids.
 */
export function misoConfig(network: Network, overrides: MisoConfigOverrides = {}): MisoConfig {
  if (network === "mainnet") {
    throw new Error(
      "@misofm/sdk/read: no mainnet configuration yet. Deploy the Move packages, then fill in the mainnet block in src/read/config.ts.",
    );
  }
  return { ...TESTNET, ...stripUndefined(overrides) };
}

/** `{ a: undefined }` must not clobber a real default when spread. */
function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
