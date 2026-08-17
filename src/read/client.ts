// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// The one client every read in this SDK goes through.
//
// Two transports, because Sui splits the job:
//   core (gRPC)  the data plane — objects by id, objects by owner, balances,
//                transactions. Everything cheap and current.
//   graphql      the two questions gRPC cannot answer: "which object has type X"
//                (share type → work id, for the studio catalog and the receipt's
//                royalty hop) and "what did this pruned transaction do".
//
// It also carries the resolved `MisoConfig`, so a read function takes ONE argument
// and never has a package id threaded through its signature.
//
// The casts below are load-bearing and deliberate: @misonetwork/miso-protocol and
// @misonetwork/miso-party each type against their own installed copy of
// @mysten/sui. Those copies are structurally identical but nominally distinct
// (private class fields), so TypeScript refuses the assignment even though the
// runtime object is the same one. miso-app solved this with a cast at each call
// site (`lib/pressing.ts:25`, `lib/party.ts:55`); here it happens ONCE, and
// nothing downstream of this file casts anything.

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import type { SuiClientRegistration } from "@mysten/sui/client";
import { party, type PartyClient } from "@misonetwork/miso-party/client";
import { misoConfig, networkFrom, type MisoConfig, type MisoConfigOverrides, type Network } from "./config.ts";

/**
 * The structural slice of a Sui client the protocol SDK's read helpers want. They
 * declare `ClientWithCoreApi` against their own @mysten/sui; this alias names the
 * same shape from our side so the one cast in `createMisoClient` is explicit
 * rather than an `any` smeared across the codebase.
 */
export type ProtocolClient = Parameters<typeof import("@misonetwork/sdk").getReleaseById>[0];

/** A GraphQL client in the shape the protocol SDK's type-discovery queries want. */
export type ProtocolGraphQLClient = SuiGraphQLClient;

export interface MisoClient {
  config: MisoConfig;
  /** gRPC data plane, extended with the party read API (`sui.party.getPartyById(…)`). */
  sui: SuiGrpcClient & { party: PartyClient };
  /** The same client, typed for the protocol SDK's read helpers. */
  protocol: ProtocolClient;
  /** GraphQL RPC, typed for the protocol SDK's type-discovery queries. */
  graphql: ProtocolGraphQLClient;
  /** The raw GraphQL client, for this SDK's own queries (the pruned-transaction read). */
  graphqlRaw: SuiGraphQLClient;
}

export interface CreateMisoClientOptions extends MisoConfigOverrides {
  /** "testnet" | "mainnet". A bare string (e.g. a Worker's `NETWORK` var) is accepted. */
  network?: Network | string;
}

/**
 * Build the client for a network. Endpoint overrides let a deployment point at a
 * private fullnode or an indexer without forking the config.
 */
export function createMisoClient(options: CreateMisoClientOptions = {}): MisoClient {
  const { network, ...overrides } = options;
  const config = misoConfig(networkFrom(network), overrides);

  const grpc = new SuiGrpcClient({ baseUrl: config.grpcUrl, network: config.network });
  const graphqlRaw = new SuiGraphQLClient({ url: config.graphqlUrl, network: config.network });

  const registration = party(config.party) as unknown as SuiClientRegistration<typeof grpc, "party", PartyClient>;
  const sui = grpc.$extend(registration);

  return {
    config,
    sui,
    protocol: sui as unknown as ProtocolClient,
    graphql: graphqlRaw as unknown as ProtocolGraphQLClient,
    graphqlRaw,
  };
}
