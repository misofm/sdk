// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Per-network on-chain identity: which packages the reads address, which objects
// they read, and which endpoints they read through. Every id that used to be a
// hard-coded constant inside miso-app (`lib/party.ts`, `lib/release.ts`,
// `lib/money.ts`, `lib/drops.ts`) lives here instead, so a redeploy is a change
// in ONE file that every surface picks up.
//
// Testnet values are baked from the verified 2026-08-19 deployment. Mainnet is
// deliberately unavailable until this ABI is deployed there.

import { MISO_PLATFORM_DEPLOYMENTS } from "../deployments.ts";

export type Network = "testnet" | "mainnet";

/** Missing defaults to Testnet for local development; invalid values fail closed. */
export function networkFrom(value: string | undefined): Network {
  if (value === undefined || value === "testnet") return "testnet";
  if (value === "mainnet") return "mainnet";
  throw new Error(`@misofm/sdk/read: unsupported network "${value}".`);
}

/** Package ids for the miso protocol core and the extensions the read layer touches. */
export interface ProtocolIds {
  /** `miso` core — Composition / Recording / Release, and the origin of every derived admin cap. */
  miso: string;
  /** `miso_drop` — `drop::buy` and the `Drop` objects the pressing pages read. */
  drop: string;
  /** `miso_record` package — the exact owner/type namespace for `record::Record`. */
  record: string;
  /** `miso_record` shared `Settings` object — the mint witness authorizer. */
  recordSettings: string;
  /** Release coordinator package and its shared derivation-parent object. */
  releaseRegistry: string;
  releaseRegistryId: string;
  /** `release_cover_art` — the release cover extension. */
  releaseCoverArt: string;
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
    miso: MISO_PLATFORM_DEPLOYMENTS.testnet.protocol.packageId,
    drop: MISO_PLATFORM_DEPLOYMENTS.testnet.packages.drop,
    record: MISO_PLATFORM_DEPLOYMENTS.testnet.packages.record,
    recordSettings: MISO_PLATFORM_DEPLOYMENTS.testnet.objects.recordSettings,
    releaseRegistry: MISO_PLATFORM_DEPLOYMENTS.testnet.packages.releaseRegistry,
    releaseRegistryId: MISO_PLATFORM_DEPLOYMENTS.testnet.objects.releaseRegistry,
    releaseCoverArt: MISO_PLATFORM_DEPLOYMENTS.testnet.packages.releaseCoverArt,
    compositionCredits: MISO_PLATFORM_DEPLOYMENTS.testnet.packages.compositionCredits,
    recordingCredits: MISO_PLATFORM_DEPLOYMENTS.testnet.packages.recordingCredits,
    releaseCredits: MISO_PLATFORM_DEPLOYMENTS.testnet.packages.releaseCredits,
    credit: MISO_PLATFORM_DEPLOYMENTS.testnet.packages.credit,
  },
  party: MISO_PLATFORM_DEPLOYMENTS.testnet.party,
  money: {
    usdCoinType: "0x77774cb7b8cb5622b4ef2658101bf5f1e965418297fe874b683df8f760b6e749::fakeusd::FakeUsd",
    usdDecimals: 6,
  },
  grpcUrl: "https://fullnode.testnet.sui.io",
  graphqlUrl: "https://graphql.testnet.sui.io/graphql",
  walrusAggregatorUrl: "https://aggregator.walrus-testnet.walrus.space",
  apiBaseUrl: "https://api.testnet.miso.fm",
  // Content from the retired deployment is intentionally not carried forward.
  discoverReleaseIds: [],
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
      `@misofm/sdk/read: no bundled Miso platform deployment for network "${network}".`,
    );
  }
  return { ...TESTNET, ...stripUndefined(overrides) };
}

/** `{ a: undefined }` must not clobber a real default when spread. */
function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
