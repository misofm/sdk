// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Per-network on-chain identity: which packages the reads address, which objects
// they read, and which endpoints they read through. Every id that used to be a
// hard-coded constant inside miso-app (`lib/party.ts`, `lib/release.ts`,
// `lib/money.ts`, `lib/drops.ts`) lives here instead, so a redeploy is a change
// in ONE file that every surface picks up.
//
// Both networks stay unavailable until the fresh protocol publish is configured;
// pre-launch has no compatibility lane for the old deployment.

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
  /** `miso_record` package — the exact owner/type namespace for `record::Record`. */
  record: string;
  /** `miso_record` shared `Settings` object — the mint witness authorizer. */
  recordSettings: string;
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

// TODO(publish): replace this guard with a fresh `TESTNET: MisoConfig` after
// republishing every protocol package. Set every `protocol` package/object id
// from that publish; do not reuse any id from the retired deployment.
// TODO(publish): set `protocol.record` to the fresh `miso_record` package id;
// it is distinct from the `protocol.recordSettings` shared object id.
// TODO(publish): at the `ProtocolIds` declaration above, add `releaseRegistry`
// and `releaseRegistryId`; set the latter from
// `ReleaseRegistryCreatedEvent.registry_id` in the release_registry publish tx.
// TODO(publish): recreate Discover content under the fresh packages, then add
// only those release ids to `discoverReleaseIds`.
const TESTNET: MisoConfig | null = null;

/** Fields a deployment may override without forking the whole config (endpoints, shelf). */
export type MisoConfigOverrides = Partial<
  Pick<MisoConfig, "grpcUrl" | "graphqlUrl" | "walrusAggregatorUrl" | "apiBaseUrl" | "discoverReleaseIds">
>;

/**
 * The config for `network`. Mainnet throws until its packages are deployed and
 * filled in here — a mainnet worker must fail loudly, never read testnet ids.
 */
export function misoConfig(network: Network, overrides: MisoConfigOverrides = {}): MisoConfig {
  if (network === "mainnet" || !TESTNET) {
    throw new Error(
      "@misofm/sdk/read: no fresh deployment configuration yet. Publish the protocol packages, then fill in src/read/config.ts.",
    );
  }
  return { ...TESTNET, ...stripUndefined(overrides) };
}

/** `{ a: undefined }` must not clobber a real default when spread. */
function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
