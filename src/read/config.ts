// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Per-network on-chain identity: which packages the reads address, which objects
// they read, and which endpoints they read through. Every id that used to be a
// hard-coded constant inside miso-app (`lib/party.ts`, `lib/release.ts`,
// `lib/money.ts`, `lib/pressing.ts`) lives here instead, so a redeploy is a change
// in ONE file that every surface picks up.
//
// There are intentionally no baked network IDs while the immutable stack is
// republished. A read client must receive a complete verified configuration from
// its caller; silently retaining the old ABI would be unsafe.

import type { MisoDeployment } from "@misonetwork/sdk/deployments";

export type Network = "testnet" | "mainnet";

/** Missing defaults to Testnet for local development; invalid values fail closed. */
export function networkFrom(value: string | undefined): Network {
  if (value === undefined || value === "testnet") return "testnet";
  if (value === "mainnet") return "mainnet";
  throw new Error(`@misofm/sdk/read: unsupported network "${value}".`);
}

/** Package ids for the miso protocol core and the extensions the read layer touches. */
export interface ProtocolIds {
  /** `miso_pressing` — permanent Pressing runs and per-currency Listings. */
  pressing: string;
  /** `miso_record` package — the exact owner/type namespace for `record::Record`. */
  record: string;
  /** `release_cover_art` — the release cover extension. */
  releaseCoverArt: string;
  /** `composition_credits` / `recording_credits` / `release_credits` extensions. */
  compositionCredits: string;
  recordingCredits: string;
  releaseCredits: string;
  /** `miso_credit` — the shared `Credit<Role>` value type credits are built from. */
  credit: string;
}

/** The currency the app prices records in, and where test dollars come from. */
export interface MoneyIds {
  /** Coin type balances, listings, and purchases are denominated in. */
  usdCoinType: string;
  usdDecimals: number;
}

export interface MisoConfig {
  network: Network;
  /** Complete package set used by the integrated `client.miso` SDK. */
  deployment: MisoDeployment;
  protocol: ProtocolIds;
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
  /** Explicit currency offers on the Discover shelf, in display order. */
  discoverSales: readonly DiscoverSale[];
}

/** One release/currency pair to resolve by Pressing and Listing derived address. */
export interface DiscoverSale {
  releaseId: string;
  currencyType: string;
}

/** Fields a deployment may override without forking the whole config (endpoints, shelf). */
export type MisoConfigOverrides = Partial<
  Pick<MisoConfig, "grpcUrl" | "graphqlUrl" | "walrusAggregatorUrl" | "apiBaseUrl" | "discoverSales">
>;

/**
 * Bundled read configuration is disabled until the admin-cli publish flow has
 * recorded every new immutable package and singleton object. This is fail-closed
 * by design: old testnet types cannot be mistaken for the current ABI.
 */
export function misoConfig(network: Network, overrides: MisoConfigOverrides = {}): MisoConfig {
  void overrides;
  throw new Error(
    `@misofm/sdk/read: no bundled Miso platform deployment for network "${network}". ` +
      "Pass a complete verified MisoConfig to createMisoClient instead.",
  );
}

/** `{ a: undefined }` must not clobber a real default when spread. */
function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
