// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The client extension — Sui's recommended shape for an SDK
// (https://sdk.mystenlabs.com/sui/sdk-building). Register it once and the
// platform layer hangs off whatever client you already have:
//
//   const client = new SuiGrpcClient({ network, baseUrl })
//     .$extend(misoPlatform({ packageId, settingsId }));
//
//   await client.misoPlatform.getSale({ releaseId, currencyType });
//   tx.add(client.misoPlatform.tx.buyRecord({ releaseId, currencyType, amount, recipient }));
//
// Two things this buys over calling the bare functions:
//
//   IDS ARE CONFIGURED ONCE. Every builder and reader below needs the pressing
//   package id, and half of them need the record `Settings` too. Threading those
//   through 20 call sites is how an app ends up publishing against one package and
//   reading against another.
//
//   IT COMPOSES. `register` takes the transport-agnostic `ClientWithCoreApi`, never
//   a concrete client, so this works on gRPC, GraphQL, or JSON-RPC — and the
//   builders stay thunks, so a platform call and a protocol call go in the same PTB.
//
// Namespaces follow the guide's convention: top-level methods read and parse,
// `tx` builds transactions without executing, `bcs` exposes the generated struct
// definitions, `ids` is the address math that replaces a registry.

import type { ClientWithCoreApi } from "@mysten/sui/client";
import type { Signer } from "@mysten/sui/cryptography";

import * as listingContract from "./contracts/miso_pressing/listing.ts";
import * as pressingContract from "./contracts/miso_pressing/pressing.ts";
import * as releaseRegistry from "./contracts/release_registry/release_registry.ts";
import {
  buyRecord,
  deriveListingId,
  derivePressingAdminCapId,
  derivePressingId,
  deriveSaleIds,
  getListing,
  getPressing,
  getSale,
  openListing,
  openPressing,
  setListingPrice,
  setListingState,
  setPressingState,
} from "./pressing.ts";
import type {
  BuyRecordParams,
  GetSaleParams,
  ListingView,
  OpenListingParams,
  OpenPressingParams,
  PressingView,
  SetListingPriceParams,
  SetListingStateParams,
  SetPressingStateParams,
} from "./pressing.ts";
import {
  publishShareCurrency,
  initializeShareCurrency,
  publishComposition,
  publishRecording,
  publishCompositionAndRecording,
  publishRelease,
} from "./transactions.ts";
import type {
  TxThunk,
  PublishCompositionParams,
  PublishRecordingParams,
  PublishCompositionAndRecordingParams,
  PublishReleaseParams,
} from "./transactions.ts";
import * as share from "./share.ts";

export interface MisoPlatformConfig {
  /** The published `miso_pressing` package. */
  packageId: string;
  /**
   * The `miso_record` shared `Settings` that authorizes `miso_pressing`'s
   * `MintWitness`. Required to buy; optional if this client only ever reads.
   */
  settingsId?: string;
  /**
   * The `@misonetwork/sdk` protocol package (miso core). Required for the
   * publish builders (`publishComposition`, `publishRecording`,
   * `publishCompositionAndRecording`) — optional if this client only ever
   * sells pressed records.
   */
  misoPackageId?: string;
  /**
   * The minato share-disperse package. Bound into the publish builders so
   * callers don't repeat it; required alongside `misoPackageId` for the same
   * builders (they disperse shares via minato).
   */
  minatoPackageId?: string;
  /** The published `release_registry` extension package used to mint releases. */
  releaseRegistryPackageId?: string;
  /** The one shared `ReleaseRegistry` object created by that package's `init`. */
  releaseRegistryId?: string;
}

/** Params with the ids this client already knows dropped from the call site. */
type Configured<T> = Omit<T, "misoPressingPackageId" | "settingsId">;

/** Publish-builder params with the protocol/minato ids this client already knows dropped. */
type ConfiguredPublish<T> = Omit<T, "misoPackageId" | "minatoPackageId">;

/** Release-builder params with this client's core, share, and registry ids dropped. */
type ConfiguredRelease<T> = Omit<T, "misoPackageId" | "minatoPackageId" | "releaseRegistryPackageId" | "releaseRegistryId">;

export class MisoPlatformClient {
  readonly #client: ClientWithCoreApi;
  readonly #config: MisoPlatformConfig;

  constructor(client: ClientWithCoreApi, config: MisoPlatformConfig) {
    this.#client = client;
    this.#config = config;
  }

  get packageId(): string {
    return this.#config.packageId;
  }

  #settings(): string {
    const { settingsId } = this.#config;
    if (!settingsId) {
      throw new Error(
        "misoPlatform: `settingsId` is required to build a purchase — pass it to misoPlatform({ settingsId }).",
      );
    }
    return settingsId;
  }

  #misoPackageId(): string {
    const { misoPackageId } = this.#config;
    if (!misoPackageId) {
      throw new Error(
        "misoPlatform: `misoPackageId` is required for the publish builders " +
          "(publishComposition, publishRecording, publishCompositionAndRecording) — pass it to misoPlatform({ misoPackageId }).",
      );
    }
    return misoPackageId;
  }

  #minatoPackageId(): string {
    const { minatoPackageId } = this.#config;
    if (!minatoPackageId) {
      throw new Error(
        "misoPlatform: `minatoPackageId` is required for the publish builders that disperse shares " +
          "(publishComposition, publishRecording, publishCompositionAndRecording) — pass it to misoPlatform({ minatoPackageId }).",
      );
    }
    return minatoPackageId;
  }

  #releaseRegistry(): { packageId: string; id: string } {
    const { releaseRegistryPackageId: packageId, releaseRegistryId: id } = this.#config;
    if (!packageId || !id) {
      throw new Error(
        "misoPlatform: `releaseRegistryPackageId` and `releaseRegistryId` are required to build a release — pass both to misoPlatform(...).",
      );
    }
    return { packageId, id };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  /** The run itself, or `null` if this release has never opened one. */
  getPressing(pressingId: string): Promise<PressingView | null> {
    return getPressing(this.#client, pressingId);
  }

  /** One currency's offer, or `null` if the run does not sell in it. */
  getListing(listingId: string): Promise<ListingView | null> {
    return getListing(this.#client, listingId);
  }

  /** Run + one currency's offer in a single round trip, by address math. */
  getSale(p: Configured<GetSaleParams>): Promise<{
    pressing: PressingView | null;
    listing: ListingView | null;
  }> {
    return getSale(this.#client, { ...p, misoPressingPackageId: this.packageId });
  }

  // ── Address math ──────────────────────────────────────────────────────────

  readonly ids = {
    pressing: (releaseId: string) => derivePressingId(releaseId, this.packageId),
    pressingAdminCap: (pressingId: string) =>
      derivePressingAdminCapId(pressingId, this.packageId),
    listing: (pressingId: string, currencyType: string) =>
      deriveListingId(pressingId, currencyType, this.packageId),
    sale: (releaseId: string, currencyType: string) =>
      deriveSaleIds(releaseId, currencyType, this.packageId),
  };

  // ── Transaction builders ──────────────────────────────────────────────────

  readonly tx = {
    buyRecord: (p: Configured<BuyRecordParams>): TxThunk =>
      buyRecord({
        ...p,
        settingsId: this.#settings(),
        misoPressingPackageId: this.packageId,
      }),
    openPressing: (p: Configured<OpenPressingParams>): TxThunk =>
      openPressing({ ...p, misoPressingPackageId: this.packageId }),
    openListing: (p: Configured<OpenListingParams>): TxThunk =>
      openListing({ ...p, misoPressingPackageId: this.packageId }),
    setListingPrice: (p: Configured<SetListingPriceParams>): TxThunk =>
      setListingPrice({ ...p, misoPressingPackageId: this.packageId }),
    setListingState: (p: Configured<SetListingStateParams>): TxThunk =>
      setListingState({ ...p, misoPressingPackageId: this.packageId }),
    setPressingState: (p: Configured<SetPressingStateParams>): TxThunk =>
      setPressingState({ ...p, misoPressingPackageId: this.packageId }),

    // Publishing (protocol works + minato share economics) — package-id-free
    // builders pass through unchanged; the rest bind this client's
    // `misoPackageId`/`minatoPackageId`, throwing at call time if either is
    // missing (kept optional on the client so a sell-only client, e.g. a
    // storefront that never mints new works, doesn't need to carry them).
    publishShareCurrency,
    initializeShareCurrency,
    publishComposition: (p: ConfiguredPublish<PublishCompositionParams>): TxThunk =>
      publishComposition({ ...p, misoPackageId: this.#misoPackageId(), minatoPackageId: this.#minatoPackageId() }),
    publishRecording: (p: ConfiguredPublish<PublishRecordingParams>): TxThunk =>
      publishRecording({ ...p, misoPackageId: this.#misoPackageId(), minatoPackageId: this.#minatoPackageId() }),
    publishCompositionAndRecording: (p: ConfiguredPublish<PublishCompositionAndRecordingParams>): TxThunk =>
      publishCompositionAndRecording({ ...p, misoPackageId: this.#misoPackageId(), minatoPackageId: this.#minatoPackageId() }),
    publishRelease: (p: ConfiguredRelease<PublishReleaseParams>): TxThunk => {
      const registry = this.#releaseRegistry();
      return publishRelease({
        ...p,
        misoPackageId: this.#misoPackageId(),
        releaseRegistryPackageId: registry.packageId,
        releaseRegistryId: registry.id,
      });
    },
  };

  // ── Share currency provisioning (executes; Signer pattern) ─────────────────

  /** Publishes + initializes a fresh share currency (two txs). */
  async createShareCurrency(signer: Signer, params: share.CreateShareCurrencyParams): Promise<share.ShareCurrency> {
    return share.createShareCurrency(this.#client, signer, params);
  }

  // ── Generated layer ───────────────────────────────────────────────────────

  /** Generated Move-call bindings, for commands this facade doesn't wrap. */
  readonly call = { listing: listingContract, pressing: pressingContract, releaseRegistry };

  /** Generated BCS definitions, for parsing objects or events yourself. */
  readonly bcs = {
    Pressing: pressingContract.Pressing,
    PressingAdminCap: pressingContract.PressingAdminCap,
    Listing: listingContract.Listing,
    Price: listingContract.Price,
    ReleaseRegistry: releaseRegistry.ReleaseRegistry,
    ReleaseRegistryCreatedEvent: releaseRegistry.ReleaseRegistryCreatedEvent,
  };
}

/**
 * Registers the platform layer on a Sui client. Pass the result to `$extend`.
 *
 * `settingsId` is optional so a read-only client (an indexer, a catalog page) can
 * skip it; asking to build a purchase without it throws rather than sending a
 * transaction against the wrong `Settings`.
 */
export function misoPlatform(config: MisoPlatformConfig) {
  return {
    name: "misoPlatform" as const,
    register: (client: ClientWithCoreApi) => new MisoPlatformClient(client, config),
  };
}
