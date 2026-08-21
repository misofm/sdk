// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The client extension — Sui's recommended shape for an SDK
// (https://sdk.mystenlabs.com/sui/sdk-building). Register it once and the
// platform layer hangs off whatever client you already have:
//
//   const client = new SuiGrpcClient({ network, baseUrl }).$extend(miso());
//
//   await client.miso.getSale({ releaseId, currencyType });
//   await client.miso.protocol.getReleaseById(releaseId);
//   tx.add(client.miso.tx.buyRecord({ releaseId, currencyType, amount, recipient }));
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

import type {
  ClientWithCoreApi,
  SuiClientRegistration,
} from "@mysten/sui/client";
import type { Signer } from "@mysten/sui/cryptography";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import {
  miso as protocolMiso,
  type MisoProtocolClient,
} from "@misonetwork/sdk/client";

import * as listingContract from "./contracts/miso_pressing/listing.ts";
import * as pressingContract from "./contracts/miso_pressing/pressing.ts";
import * as genreContract from "./contracts/genre/genre.ts";
import * as releaseDescriptionContract from "./contracts/release_description/release_description.ts";
import * as releaseDspLinkContract from "./contracts/release_dsp_link/release_dsp_link.ts";
import * as releaseGenreContract from "./contracts/release_genre/release_genre.ts";
import * as releaseKindContract from "./contracts/release_kind/release_kind.ts";
import * as releaseRevenueDistributorContract from "./contracts/release_revenue_distributor/release_revenue_distributor.ts";
import * as vaultContract from "./contracts/vault/vault.ts";
import * as compositionRoyaltyPoolContract from "./contracts/composition_royalty_pool/composition_royalty_pool.ts";
import * as recordingRoyaltyPoolContract from "./contracts/recording_royalty_pool/recording_royalty_pool.ts";
import * as compositionRoutedStakeContract from "./contracts/composition_routed_stake/composition_routed_stake.ts";
import * as routedStakeContract from "./contracts/routed_stake/routed_stake.ts";
import * as royaltyPoolContract from "./contracts/royalty_pool/pool.ts";
import * as recordingAdvisoryContract from "./contracts/recording_advisory/recording_advisory.ts";
import * as recordingLanguageContract from "./contracts/recording_language/recording_language.ts";
import * as recordingMasterReferenceContract from "./contracts/recording_master_reference/recording_master_reference.ts";
import * as recordingPreviewContract from "./contracts/recording_preview/recording_preview.ts";
import * as vaultActions from "./vault.ts";
import * as coverArtContract from "./contracts/cover_art/cover_art.ts";
import * as releaseCoverArtContract from "./contracts/release_cover_art/release_cover_art.ts";
import * as releaseCreditsContract from "./contracts/release_credits/release_credits.ts";
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
import {
  publishReleaseGraph,
  type PublishReleaseGraphParams,
} from "./release-graph.ts";
import {
  getMisoPlatformDeployment,
  type MisoPlatformDeployment,
} from "./deployments.ts";
import {
  deriveGenreId,
  setReleaseDescription,
  setReleaseDspLinks,
  setReleaseGenres,
  setReleaseKind,
  type SetReleaseDescriptionParams,
  type SetReleaseDspLinksParams,
  type SetReleaseGenresParams,
  type SetReleaseKindParams,
} from "./release-extensions.ts";
import { addReleaseCredit, type AddReleaseCreditParams } from "./credits.ts";
import {
  setReleaseCover,
  setReleaseTrackCover,
  type SetReleaseCoverParams,
  type SetReleaseTrackCoverParams,
} from "./cover.ts";

type BoundMoveFunction<F> = F extends (options: infer Options) => infer Result
  ? Options extends { package?: unknown }
    ? (options: Omit<Options, "package">) => Result
    : F
  : F;
type BoundModule<M extends object, Available extends readonly (keyof M)[]> = {
  [Key in Available[number]]: BoundMoveFunction<M[Key]>;
};

/**
 * Bind an explicit safe subset of a generated module to one immutable package.
 * Callers cannot supply or override `package`; reference-returning, UID-only,
 * and package-internal constructors never appear in this executable facade.
 */
function bindModulePackage<M extends object, K extends readonly (keyof M)[]>(
  mod: M,
  pkg: string,
  available: K,
): BoundModule<M, K> {
  const out: Record<string, unknown> = {};
  for (const key of available) {
    const value = (mod as Record<PropertyKey, unknown>)[key];
    out[String(key)] =
      typeof value === "function"
        ? (options: { package?: string }) =>
            (value as (o: unknown) => unknown)({ ...options, package: pkg })
        : value;
  }
  return out as BoundModule<M, K>;
}

export interface MisoOptions<Name extends string = "miso"> {
  /** Name for the client extension. Defaults to `miso`. */
  name?: Name;
  /** Complete custom deployment; omit to select the bundled client network. */
  deployment?: MisoPlatformDeployment;
  /** Required only by protocol methods that perform global type discovery. */
  graphqlClient?: SuiGraphQLClient;
}

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
  /** The shared core `miso::release::ReleaseRegistry` object. */
  releaseRegistryId?: string;
  /** Release metadata/discovery extension package ids. */
  releaseKindPackageId?: string;
  releaseDescriptionPackageId?: string;
  releaseGenrePackageId?: string;
  releaseDspLinkPackageId?: string;
  recordingAdvisoryPackageId?: string;
  recordingLanguagePackageId?: string;
  recordingMasterReferencePackageId?: string;
  recordingPreviewPackageId?: string;
  /** Shared custody package; needed for VaultAdminCap authority orchestration. */
  vaultPackageId?: string;
  /** Generic royalty-pool value package used by pool and routed-stake helpers. */
  royaltyPoolPackageId?: string;
  /** Vault plugins, deliberately separate from data-extension package ids. */
  compositionRoyaltyPoolPluginPackageId?: string;
  recordingRoyaltyPoolPluginPackageId?: string;
  compositionRoutedStakePluginPackageId?: string;
  routedStakePackageId?: string;
  releaseRevenueDistributorPluginPackageId?: string;
  releaseCreditsPackageId?: string;
  misoCreditPackageId?: string;
  coverArtPackageId?: string;
  releaseCoverArtPackageId?: string;
  /** Curated genre vocabulary package and its shared derivation parent. */
  genrePackageId?: string;
  genreRegistryId?: string;
  /** External ori package used to create WalrusData values. */
  oriPackageId?: string;
}

/** Params with the ids this client already knows dropped from the call site. */
type DistributiveOmit<T, Keys extends PropertyKey> = T extends unknown ? Omit<T, Keys> : never;
type Configured<T> = DistributiveOmit<T, "misoPressingPackageId" | "settingsId">;

/** Publish-builder params with the protocol/minato ids this client already knows dropped. */
type ConfiguredPublish<T> = DistributiveOmit<T, "misoPackageId" | "minatoPackageId">;

/** Release-builder params with this client's core, share, and registry ids dropped. */
type ConfiguredRelease<T> = DistributiveOmit<
  T,
  | "misoPackageId"
  | "minatoPackageId"
  | "releaseRegistryId"
>;

type ConfiguredReleaseKind = DistributiveOmit<SetReleaseKindParams, "releaseKindPackageId">;
type ConfiguredReleaseDescription = DistributiveOmit<
  SetReleaseDescriptionParams,
  "releaseDescriptionPackageId"
>;
type ConfiguredReleaseGenres = DistributiveOmit<
  SetReleaseGenresParams,
  "releaseGenrePackageId"
>;
type ConfiguredReleaseDspLinks = DistributiveOmit<
  SetReleaseDspLinksParams,
  "releaseDspLinkPackageId"
>;
type ConfiguredReleaseCredit = DistributiveOmit<
  AddReleaseCreditParams,
  "releaseCreditsPackageId" | "misoCreditPackageId"
>;
type ConfiguredReleaseCover = DistributiveOmit<
  SetReleaseCoverParams,
  "coverArtPackageId" | "releaseCoverArtPackageId" | "oriPackageId"
>;
type ConfiguredReleaseTrackCover = DistributiveOmit<
  SetReleaseTrackCoverParams,
  "coverArtPackageId" | "releaseCoverArtPackageId" | "oriPackageId"
>;

/** Whole-graph params with this client's package ids dropped. */
export type ConfiguredReleaseGraphParams = Omit<PublishReleaseGraphParams, "misoPackageId" | "minatoPackageId">;

export class MisoPlatformClient {
  readonly #client: ClientWithCoreApi;
  readonly #config: MisoPlatformConfig;
  /** The permissionless protocol layer wrapped by this platform facade. */
  readonly protocol?: MisoProtocolClient;
  /** Bundled/custom deployment selected for the full facade, when available. */
  readonly deployment?: MisoPlatformDeployment;

  constructor(
    client: ClientWithCoreApi,
    config: MisoPlatformConfig,
    protocol?: MisoProtocolClient,
    deployment?: MisoPlatformDeployment,
  ) {
    this.#client = client;
    this.#config = config;
    // A pressing-only facade must not implicitly register a fail-closed core
    // extension. Supply a core deployment/misoPackageId when `protocol` is
    // needed; otherwise this remains a safe, independent pressing client.
    this.protocol = protocol ?? (config.misoPackageId
      ? protocolMiso({ deployment: { packageId: config.misoPackageId } }).register(client)
      : undefined);
    this.deployment = deployment;
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
          "(publishComposition, publishRecording, publishCompositionAndRecording, publishRelease) — pass it to misoPlatform({ misoPackageId }).",
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

  #releaseRegistryId(): string {
    const { releaseRegistryId: id } = this.#config;
    if (!id) {
      throw new Error(
        "misoPlatform: `releaseRegistryId` is required to build a release.",
      );
    }
    return id;
  }

  #requiredConfig(field: keyof MisoPlatformConfig, operation: string): string {
    const value = this.#config[field];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(
        `misoPlatform: \`${String(field)}\` is required for ${operation}.`,
      );
    }
    return value;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  /** The run itself, or `null` if this release has never opened one. */
  getPressing(pressingId: string): Promise<PressingView | null> {
    return getPressing(this.#client, pressingId, this.packageId);
  }

  /** One currency's offer, or `null` if the run does not sell in it. */
  getListing(listingId: string): Promise<ListingView | null> {
    return getListing(this.#client, listingId, this.packageId);
  }

  /** Run + one currency's offer in a single round trip, by address math. */
  getSale(p: Configured<GetSaleParams>): Promise<{
    pressing: PressingView | null;
    listing: ListingView | null;
  }> {
    return getSale(this.#client, {
      ...p,
      misoPressingPackageId: this.packageId,
    });
  }

  // ── Address math ──────────────────────────────────────────────────────────

  readonly ids = {
    pressing: (releaseId: string) =>
      derivePressingId(releaseId, this.packageId),
    pressingAdminCap: (pressingId: string) =>
      derivePressingAdminCapId(pressingId, this.packageId),
    listing: (pressingId: string, currencyType: string) =>
      deriveListingId(pressingId, currencyType, this.packageId),
    sale: (releaseId: string, currencyType: string) =>
      deriveSaleIds(releaseId, currencyType, this.packageId),
    genre: (canonicalName: string) =>
      deriveGenreId(
        this.#requiredConfig("genreRegistryId", "genre id derivation"),
        this.#requiredConfig("genrePackageId", "genre id derivation"),
        canonicalName,
      ),
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
    publishComposition: (
      p: ConfiguredPublish<PublishCompositionParams>,
    ): TxThunk =>
      publishComposition({
        ...p,
        misoPackageId: this.#misoPackageId(),
        minatoPackageId: this.#minatoPackageId(),
      }),
    publishRecording: (p: ConfiguredPublish<PublishRecordingParams>): TxThunk =>
      publishRecording({
        ...p,
        misoPackageId: this.#misoPackageId(),
        minatoPackageId: this.#minatoPackageId(),
      }),
    publishCompositionAndRecording: (
      p: ConfiguredPublish<PublishCompositionAndRecordingParams>,
    ): TxThunk =>
      publishCompositionAndRecording({
        ...p,
        misoPackageId: this.#misoPackageId(),
        minatoPackageId: this.#minatoPackageId(),
      }),
    publishRelease: (p: ConfiguredRelease<PublishReleaseParams>): TxThunk => {
      return publishRelease({
        ...p,
        misoPackageId: this.#misoPackageId(),
        releaseRegistryId: this.#releaseRegistryId(),
      });
    },
    publishReleaseGraph: (p: ConfiguredReleaseGraphParams): TxThunk => {
      return publishReleaseGraph({
        ...p,
        misoPackageId: this.#misoPackageId(),
        minatoPackageId: this.#minatoPackageId(),
      });
    },
    setReleaseKind: (p: ConfiguredReleaseKind): TxThunk =>
      setReleaseKind({
        ...p,
        releaseKindPackageId: this.#requiredConfig(
          "releaseKindPackageId",
          "setReleaseKind",
        ),
      }),
    setReleaseDescription: (p: ConfiguredReleaseDescription): TxThunk =>
      setReleaseDescription({
        ...p,
        releaseDescriptionPackageId: this.#requiredConfig(
          "releaseDescriptionPackageId",
          "setReleaseDescription",
        ),
      }),
    setReleaseGenres: (p: ConfiguredReleaseGenres): TxThunk =>
      setReleaseGenres({
        ...p,
        releaseGenrePackageId: this.#requiredConfig(
          "releaseGenrePackageId",
          "setReleaseGenres",
        ),
      }),
    setReleaseDspLinks: (p: ConfiguredReleaseDspLinks): TxThunk =>
      setReleaseDspLinks({
        ...p,
        releaseDspLinkPackageId: this.#requiredConfig(
          "releaseDspLinkPackageId",
          "setReleaseDspLinks",
        ),
      }),
    addReleaseCredit: (p: ConfiguredReleaseCredit): TxThunk =>
      addReleaseCredit({
        ...p,
        releaseCreditsPackageId: this.#requiredConfig(
          "releaseCreditsPackageId",
          "addReleaseCredit",
        ),
        misoCreditPackageId: this.#requiredConfig(
          "misoCreditPackageId",
          "addReleaseCredit",
        ),
      }),
    setReleaseCover: (p: ConfiguredReleaseCover): TxThunk =>
      setReleaseCover({
        ...p,
        coverArtPackageId: this.#requiredConfig(
          "coverArtPackageId",
          "setReleaseCover",
        ),
        releaseCoverArtPackageId: this.#requiredConfig(
          "releaseCoverArtPackageId",
          "setReleaseCover",
        ),
        oriPackageId: this.#requiredConfig("oriPackageId", "setReleaseCover"),
      }),
    setReleaseTrackCover: (p: ConfiguredReleaseTrackCover): TxThunk =>
      setReleaseTrackCover({
        ...p,
        coverArtPackageId: this.#requiredConfig(
          "coverArtPackageId",
          "setReleaseTrackCover",
        ),
        releaseCoverArtPackageId: this.#requiredConfig(
          "releaseCoverArtPackageId",
          "setReleaseTrackCover",
        ),
        oriPackageId: this.#requiredConfig(
          "oriPackageId",
          "setReleaseTrackCover",
        ),
      }),
  };

  /**
   * Vault-aware builders and parsers. These take explicit object ids because a
   * VaultAdminCap is owner-held while the Vault is shared; package ids can come
   * from the deployment config or be supplied for private deployments.
   */
  readonly vault = vaultActions;

  // ── Share currency provisioning (executes; Signer pattern) ─────────────────

  /** Publishes + initializes a fresh share currency (two txs). */
  async createShareCurrency(
    signer: Signer,
    params: share.CreateShareCurrencyParams,
  ): Promise<share.ShareCurrency> {
    return share.createShareCurrency(this.#client, signer, params);
  }

  // ── Generated layer ───────────────────────────────────────────────────────

  /** Generated Move-call bindings, for commands this facade doesn't wrap. */
  get call() {
    return {
      listing: bindModulePackage(listingContract, this.packageId, ["newFixedPrice", "newFloorPrice", "newEnabledState", "newDisabledState", "buy", "setState", "setPrice", "deriveId", "hasListing", "id", "releaseId", "pressingId", "price", "state", "isLive", "amount"] as const),
      pressing: bindModulePackage(pressingContract, this.packageId, ["newScheduledState", "newActiveState", "newPausedState", "setState", "deriveId", "id", "releaseId", "supply", "isSelling", "pressingAdminCapPressingId", "verifyRecord"] as const),
      genre: this.#config.genrePackageId
        ? bindModulePackage(genreContract, this.#config.genrePackageId, ["deriveGenreId", "id"] as const)
        : undefined,
      releaseDescription: this.#config.releaseDescriptionPackageId
        ? bindModulePackage(
            releaseDescriptionContract,
            this.#config.releaseDescriptionPackageId,
            ["setDescription", "clearDescription", "hasDescription"],
          )
        : undefined,
      releaseDspLink: this.#config.releaseDspLinkPackageId
        ? bindModulePackage(
            releaseDspLinkContract,
            this.#config.releaseDspLinkPackageId,
            ["platform", "platformSpotify", "platformAppleMusic", "platformAmazonMusic", "platformBandcamp", "platformDeezer", "platformSoundcloud", "platformTidal", "platformYoutubeMusic", "newSpotify", "newAppleMusicAlbum", "newAppleMusicTrack", "newAmazonMusicAlbum", "newAmazonMusicTrack", "newBandcamp", "newDeezer", "newSoundcloud", "newTidal", "newYoutubeMusic", "setReleaseLink", "clearReleaseLink", "setTrackLink", "clearTrackLink", "clearTrackLinks", "hasReleaseLink"] as const,
          )
        : undefined,
      releaseGenre: this.#config.releaseGenrePackageId
        ? bindModulePackage(
            releaseGenreContract,
            this.#config.releaseGenrePackageId,
            ["setPrimaryGenre", "addSecondaryGenre", "removeSecondaryGenre", "setTrackPrimaryGenre", "unsetTrackPrimaryGenre", "hasGenre"] as const,
          )
        : undefined,
      releaseKind: this.#config.releaseKindPackageId
        ? bindModulePackage(
            releaseKindContract,
            this.#config.releaseKindPackageId,
            ["setKind", "unsetKind", "hasKind"] as const,
          )
        : undefined,
      releaseRevenueDistributor: this.#config.releaseRevenueDistributorPluginPackageId
        ? bindModulePackage(
            releaseRevenueDistributorContract,
            this.#config.releaseRevenueDistributorPluginPackageId,
            ["install", "uninstall", "redeemAndDistribute", "receiveAndDistribute", "isInstalled"] as const,
          )
        : undefined,
      vault: this.#config.vaultPackageId
        ? bindModulePackage(vaultContract, this.#config.vaultPackageId, ["share", "id", "vaultId", "authorizedPluginsId", "authorizedPluginCount", "isPluginAuthorized"] as const)
        : undefined,
      compositionRoyaltyPool: this.#config.compositionRoyaltyPoolPluginPackageId
        ? bindModulePackage(
            compositionRoyaltyPoolContract,
            this.#config.compositionRoyaltyPoolPluginPackageId,
            ["install", "uninstall", "initializePool", "receiveAndDeposit", "redeemAndDeposit", "isInstalled", "poolAddress"] as const,
          )
        : undefined,
      recordingRoyaltyPool: this.#config.recordingRoyaltyPoolPluginPackageId
        ? bindModulePackage(
            recordingRoyaltyPoolContract,
            this.#config.recordingRoyaltyPoolPluginPackageId,
            ["install", "uninstall", "initializePool", "receiveAndDeposit", "redeemAndDeposit", "isInstalled", "poolAddress"] as const,
          )
        : undefined,
      compositionRoutedStake: this.#config.compositionRoutedStakePluginPackageId
        ? bindModulePackage(
            compositionRoutedStakeContract,
            this.#config.compositionRoutedStakePluginPackageId,
            ["install", "uninstall", "createStake", "register", "unregister", "unstake", "restake", "isInstalled", "stakeAddress"] as const,
          )
        : undefined,
      routedStake: this.#config.routedStakePackageId
        ? bindModulePackage(routedStakeContract, this.#config.routedStakePackageId, ["share", "register", "unregister", "sweep", "unstake", "restake", "id"] as const)
        : undefined,
      royaltyPool: this.#config.royaltyPoolPackageId
        ? bindModulePackage(royaltyPoolContract, this.#config.royaltyPoolPackageId, ["share", "deposit", "redeemAndDeposit", "receiveAndDeposit", "registerStake", "unregisterStake", "claimRewards", "pendingRewards", "id", "stakedShares", "cumulativeRewardPerShare", "cumulativeDeposits", "derivedAddress", "assertDerivedFrom"] as const)
        : undefined,
      recordingAdvisory: this.#config.recordingAdvisoryPackageId
        ? bindModulePackage(recordingAdvisoryContract, this.#config.recordingAdvisoryPackageId, ["explicit", "notExplicit", "cleaned", "setRating", "unsetRating", "hasRating", "isExplicit", "isNotExplicit", "isCleaned"] as const)
        : undefined,
      recordingLanguage: this.#config.recordingLanguagePackageId
        ? bindModulePackage(recordingLanguageContract, this.#config.recordingLanguagePackageId, ["setLanguages", "setInstrumental", "unsetLanguages", "hasLanguages", "isInstrumental"] as const)
        : undefined,
      recordingMasterReference: this.#config.recordingMasterReferencePackageId
        ? bindModulePackage(recordingMasterReferenceContract, this.#config.recordingMasterReferencePackageId, ["setMasterReference", "unsetMasterReference", "hasMasterReference"] as const)
        : undefined,
      recordingPreview: this.#config.recordingPreviewPackageId
        ? bindModulePackage(recordingPreviewContract, this.#config.recordingPreviewPackageId, ["setPreview", "unsetPreview", "hasPreview"] as const)
        : undefined,
      coverArt: this.#config.coverArtPackageId
        ? bindModulePackage(coverArtContract, this.#config.coverArtPackageId, [] as const)
        : undefined,
      releaseCoverArt: this.#config.releaseCoverArtPackageId
        ? bindModulePackage(
            releaseCoverArtContract,
            this.#config.releaseCoverArtPackageId,
            ["setCover", "unsetCover", "setTrackCover", "unsetTrackCover", "hasCoverArt"] as const,
          )
        : undefined,
      releaseCredits: this.#config.releaseCreditsPackageId
        ? bindModulePackage(
            releaseCreditsContract,
            this.#config.releaseCreditsPackageId,
            ["addCredit", "removeCredit", "hasCredits"] as const,
          )
        : undefined,
    };
  }

  /** Generated BCS definitions, for parsing objects or events yourself. */
  readonly bcs = {
    Pressing: pressingContract.Pressing,
    PressingAdminCap: pressingContract.PressingAdminCap,
    Listing: listingContract.Listing,
    Price: listingContract.Price,
    VaultAdminCap: vaultContract.VaultAdminCap,
    VaultCreatedEvent: vaultContract.VaultCreatedEvent,
    ReleaseRevenueDistributedEvent:
      releaseRevenueDistributorContract.ReleaseRevenueDistributedEvent,
  };
}

/** The full Miso client exposed by `@misofm/sdk`. */
export { MisoPlatformClient as MisoClient };

/**
 * Registers the complete Miso facade at `client.miso`.
 *
 * Platform operations live directly on `client.miso`; the lower-level
 * permissionless protocol SDK is available at `client.miso.protocol`.
 */
export function miso<const Name extends string = "miso">(
  options: MisoOptions<Name> = {},
): SuiClientRegistration<ClientWithCoreApi, Name, MisoPlatformClient> {
  const name = (options.name ?? "miso") as Name;
  return {
    name,
    register: (client: ClientWithCoreApi) => {
      const deployment =
        options.deployment ?? getMisoPlatformDeployment(client.network);
      const protocol = protocolMiso({
        deployment: deployment.protocol,
        graphqlClient: options.graphqlClient,
      }).register(client);
      return new MisoPlatformClient(
        client,
        {
          packageId: deployment.packages.pressing,
          settingsId: deployment.objects.recordSettings,
          misoPackageId: deployment.protocol.packageId,
          minatoPackageId: deployment.packages.minato,
          releaseRegistryId: deployment.objects.releaseRegistry,
          releaseKindPackageId: deployment.packages.releaseKind,
          releaseDescriptionPackageId: deployment.packages.releaseDescription,
          releaseGenrePackageId: deployment.packages.releaseGenre,
          releaseDspLinkPackageId: deployment.packages.releaseDspLink,
          recordingAdvisoryPackageId: deployment.packages.recordingAdvisory,
          recordingLanguagePackageId: deployment.packages.recordingLanguage,
          recordingMasterReferencePackageId: deployment.packages.recordingMasterReference,
          recordingPreviewPackageId: deployment.packages.recordingPreview,
          vaultPackageId: deployment.packages.vault,
          royaltyPoolPackageId: deployment.packages.royaltyPool,
          compositionRoyaltyPoolPluginPackageId:
            deployment.packages.compositionRoyaltyPoolPlugin,
          recordingRoyaltyPoolPluginPackageId:
            deployment.packages.recordingRoyaltyPoolPlugin,
          compositionRoutedStakePluginPackageId:
            deployment.packages.compositionRoutedStakePlugin,
          routedStakePackageId: deployment.packages.routedStake,
          releaseRevenueDistributorPluginPackageId:
            deployment.packages.releaseRevenueDistributorPlugin,
          releaseCreditsPackageId: deployment.packages.releaseCredits,
          misoCreditPackageId: deployment.packages.credit,
          coverArtPackageId: deployment.packages.coverArt,
          releaseCoverArtPackageId: deployment.packages.releaseCoverArt,
          genrePackageId: deployment.packages.genre,
          genreRegistryId: deployment.objects.genreRegistry,
          oriPackageId: deployment.packages.ori,
        },
        protocol,
        deployment,
      );
    },
  };
}

/**
 * @deprecated Prefer zero-config `miso()`, which registers the complete facade
 * at `client.miso` and exposes the protocol layer at `client.miso.protocol`.
 *
 * `settingsId` is optional so a read-only client (an indexer, a catalog page) can
 * skip it; asking to build a purchase without it throws rather than sending a
 * transaction against the wrong `Settings`.
 */
export function misoPlatform(config: MisoPlatformConfig) {
  return {
    name: "misoPlatform" as const,
    register: (client: ClientWithCoreApi) => {
      const protocol = config.misoPackageId
        ? protocolMiso({ deployment: { packageId: config.misoPackageId } }).register(client)
        : undefined;
      return new MisoPlatformClient(client, config, protocol);
    },
  };
}
