// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Transaction builders follow the Sui SDK thunk pattern: a builder returns a
// `(tx: Transaction) => …` thunk that adds commands to a caller-owned
// `Transaction`, so a platform call composes with protocol calls and anything
// else in the same PTB.
//
// This module holds the OPINIONATED publish flows. `@misonetwork/sdk` does the
// minimum the Move semantics FORCE and returns anything a caller could
// legitimately route elsewhere; deciding where those values GO is the
// platform-layer call that lives here:
//
//   - minting a work's share supply is a protocol primitive
//     (`createComposition`/`createRecording`) — dispersing it to recipients via
//     minato, publishing (sharing) the work, and transferring its admin cap is
//     an opinion about economics;
//   - minting a release is likewise a primitive (`createRelease`) — choosing a
//     track-assembly strategy, publishing (sharing) it, and picking a recipient
//     for its `ReleaseAdminCap` is the opinion, so `finalizeRelease` /
//     `publishRelease` / `publishReleaseFromDeals` live here.
//
// Every `finalize*` here MUST run in the same PTB as the `create*` that produced
// its parts — `Composition`, `Recording`, and `Release` are all `key`-only with
// no `drop`, so none can outlive its creating transaction. That is a same-PTB
// constraint, not a same-function one, which is exactly what makes this split
// possible.
//
// Composes with `@misonetwork/sdk`'s calls in the same PTB (the
// transaction-thunk composition pattern, just crossing a package boundary now).

import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";
import {
  contracts,
  createComposition,
  createRecording,
  createRelease,
  type CompositionParts,
  type CreateCompositionParams,
  type CreateRecordingParams,
  type RecordingParts,
  type ReleaseParts,
  type ShareCurrencyBinding,
  type TxThunk,
} from "@misonetwork/sdk";

const { deal, track, release } = contracts;

// `TxThunk` is the protocol SDK's type, re-exported so platform consumers get
// the same nominal shape rather than a structurally-identical twin.
export type { TxThunk };

// ============================================================================
// Share dispersal (minato)
// ============================================================================

export interface ShareRecipient {
  address: string;
  value: number;
}

/**
 * Splits a share `Balance` across `recipients` via `minato::disperse_balance`, then
 * destroys the emptied balance. Exposed for consumers assembling custom share
 * distributions in their own PTBs.
 */
export function disperseShares(
  tx: Transaction,
  minatoPackageId: string,
  shareType: string,
  balance: TransactionObjectArgument,
  recipients: ShareRecipient[],
) {
  tx.moveCall({
    target: `${minatoPackageId}::minato::disperse_balance`,
    typeArguments: [shareType],
    arguments: [
      balance,
      tx.makeMoveVec({ type: "u64", elements: recipients.map((r) => tx.pure.u64(r.value)) }),
      tx.makeMoveVec({ type: "address", elements: recipients.map((r) => tx.pure.address(r.address)) }),
    ],
  });
  tx.moveCall({ target: "0x2::balance::destroy_zero", typeArguments: [shareType], arguments: [balance] });
}

// ============================================================================
// Share currency (external share / framework)
// ============================================================================

export interface PackageBytecode {
  modules: string[];
  dependencies: string[];
  digest: number[];
}

export function publishShareCurrency(bytecode: PackageBytecode): TxThunk {
  return (tx) => {
    const upgradeCap = tx.publish(bytecode);
    tx.moveCall({ target: "0x2::package::make_immutable", arguments: [upgradeCap] });
  };
}

const SUI_COIN_REGISTRY_ID = "0xc";

export interface InitializeShareCurrencyParams {
  shareCurrencyPackageId: string;
  name: string;
  description: string;
  iconUrl: string;
  treasuryCapRecipient: string;
}

export function initializeShareCurrency(params: InitializeShareCurrencyParams): TxThunk {
  const { shareCurrencyPackageId, name, description, iconUrl, treasuryCapRecipient } = params;
  return (tx) => {
    const treasuryCap = tx.moveCall({
      target: `${shareCurrencyPackageId}::share::initialize`,
      arguments: [tx.pure.string(name), tx.pure.string(description), tx.pure.string(iconUrl), tx.object(SUI_COIN_REGISTRY_ID)],
    });
    tx.transferObjects([treasuryCap], treasuryCapRecipient);
  };
}

// ============================================================================
// Composition
// ============================================================================

export interface FinalizeCompositionParams extends CompositionParts {
  /** The composition's `share::Share` type. */
  shareType: string;
  shareRecipients: ShareRecipient[];
  adminAddress: string;
  misoPackageId: string;
  minatoPackageId: string;
}

/**
 * The opinionated finish for a composition: disperse its share supply to
 * `shareRecipients`, publish (share) it, and transfer its admin cap to
 * `adminAddress`. Consumers that want different economics skip this and act on
 * the `CompositionParts` from `@misonetwork/sdk`'s `createComposition` directly.
 */
export function finalizeComposition(tx: Transaction, params: FinalizeCompositionParams): void {
  disperseShares(tx, params.minatoPackageId, params.shareType, params.balance, params.shareRecipients);
  tx.add(contracts.composition.publish({ package: params.misoPackageId, typeArguments: [params.shareType], arguments: [params.composition, params.adminCap] }));
  tx.transferObjects([params.adminCap], params.adminAddress);
}

export interface PublishCompositionParams extends ShareCurrencyBinding {
  title: string;
  royaltyRateBps: number;
  shareRecipients: ShareRecipient[];
  /** Sole owner of the shares + CompositionAdminCap (the zkLogin address). */
  adminAddress: string;
  misoPackageId: string;
  minatoPackageId: string;
}

/** Convenience: publish a composition end-to-end (createComposition → finalizeComposition). */
export function publishComposition(params: PublishCompositionParams): TxThunk {
  return (tx) => {
    const parts = createComposition(tx, {
      shareType: params.shareType,
      shareCurrencyId: params.shareCurrencyId,
      shareTreasuryCapId: params.shareTreasuryCapId,
      title: params.title,
      royaltyRateBps: params.royaltyRateBps,
      misoPackageId: params.misoPackageId,
    } satisfies CreateCompositionParams);
    finalizeComposition(tx, {
      ...parts,
      shareType: params.shareType,
      shareRecipients: params.shareRecipients,
      adminAddress: params.adminAddress,
      misoPackageId: params.misoPackageId,
      minatoPackageId: params.minatoPackageId,
    });
  };
}

// ============================================================================
// Recording
// ============================================================================

export interface FinalizeRecordingParams extends RecordingParts {
  /** The recording's own `share::Share` type. */
  recordingShareType: string;
  /** Share type of the parent composition. */
  compositionShareType: string;
  shareRecipients: ShareRecipient[];
  adminAddress: string;
  misoPackageId: string;
  minatoPackageId: string;
}

/**
 * The opinionated finish for a recording: publish (share) it, disperse its
 * share supply, and transfer its admin cap to `adminAddress`. A recording has
 * no embedded metadata to set — naming lives in the metadata extension.
 */
export function finalizeRecording(tx: Transaction, params: FinalizeRecordingParams): void {
  const typeArguments: [string, string] = [params.recordingShareType, params.compositionShareType];
  tx.add(contracts.recording.publish({ package: params.misoPackageId, typeArguments, arguments: [params.recording, params.adminCap] }));
  disperseShares(tx, params.minatoPackageId, params.recordingShareType, params.balance, params.shareRecipients);
  tx.transferObjects([params.adminCap], params.adminAddress);
}

export interface PublishRecordingParams extends ShareCurrencyBinding {
  /**
   * Parent composition, referenced as an on-chain object. Read-only at
   * `recording::new` (only its royalty rate and id are read).
   */
  compositionId: string;
  /** Share type of the parent composition (the recording's `CompositionShare` phantom). */
  compositionShareType: string;
  shareRecipients: ShareRecipient[];
  adminAddress: string;
  /** Slippage guard for `recording::new` — pass the composition rate you observed (default: protocol max). */
  maxRoyaltyRateBps?: number;
  misoPackageId: string;
  minatoPackageId: string;
}

/** Convenience: publish a recording against an already-on-chain composition. */
export function publishRecording(params: PublishRecordingParams): TxThunk {
  return (tx) => {
    const parts = createRecording(tx, {
      shareType: params.shareType,
      shareCurrencyId: params.shareCurrencyId,
      shareTreasuryCapId: params.shareTreasuryCapId,
      compositionShareType: params.compositionShareType,
      composition: tx.object(params.compositionId),
      maxRoyaltyRateBps: params.maxRoyaltyRateBps,
      misoPackageId: params.misoPackageId,
    } satisfies CreateRecordingParams);
    finalizeRecording(tx, {
      ...parts,
      recordingShareType: params.shareType,
      compositionShareType: params.compositionShareType,
      shareRecipients: params.shareRecipients,
      adminAddress: params.adminAddress,
      misoPackageId: params.misoPackageId,
      minatoPackageId: params.minatoPackageId,
    });
  };
}

// ============================================================================
// Composition + Recording (single PTB)
// ============================================================================

export interface PublishCompositionAndRecordingParams {
  title: string;
  royaltyRateBps: number;
  /** Share-currency binding for the composition. */
  composition: ShareCurrencyBinding & { shareRecipients: ShareRecipient[]; adminAddress: string };
  /** Share-currency binding for the recording. */
  recording: ShareCurrencyBinding & { shareRecipients: ShareRecipient[]; adminAddress: string };
  misoPackageId: string;
  minatoPackageId: string;
}

/**
 * Publishes a composition and its recording in a single atomic PTB.
 *
 * The ordering is load-bearing: `recording::new` borrows the composition by
 * immutable reference, so it must run while the composition is still an unshared,
 * transaction-local value — i.e. AFTER `composition::new` but BEFORE
 * `composition::publish` (which moves the composition into `share_object`). Hence:
 * `composition::new` → `recording::new(&comp)` → finalize composition (publish) →
 * finalize recording (publish).
 */
export function publishCompositionAndRecording(params: PublishCompositionAndRecordingParams): TxThunk {
  return (tx) => {
    const comp = createComposition(tx, {
      shareType: params.composition.shareType,
      shareCurrencyId: params.composition.shareCurrencyId,
      shareTreasuryCapId: params.composition.shareTreasuryCapId,
      title: params.title,
      royaltyRateBps: params.royaltyRateBps,
      misoPackageId: params.misoPackageId,
    } satisfies CreateCompositionParams);

    // Borrow the still-unshared composition into recording::new before publishing it.
    // The composition is created in this PTB with a known rate, so the slippage
    // guard pins that exact value — front-running is structurally impossible here.
    const rec = createRecording(tx, {
      shareType: params.recording.shareType,
      shareCurrencyId: params.recording.shareCurrencyId,
      shareTreasuryCapId: params.recording.shareTreasuryCapId,
      compositionShareType: params.composition.shareType,
      composition: comp.composition,
      maxRoyaltyRateBps: params.royaltyRateBps,
      misoPackageId: params.misoPackageId,
    } satisfies CreateRecordingParams);

    finalizeComposition(tx, {
      ...comp,
      shareType: params.composition.shareType,
      shareRecipients: params.composition.shareRecipients,
      adminAddress: params.composition.adminAddress,
      misoPackageId: params.misoPackageId,
      minatoPackageId: params.minatoPackageId,
    });

    finalizeRecording(tx, {
      ...rec,
      recordingShareType: params.recording.shareType,
      compositionShareType: params.composition.shareType,
      shareRecipients: params.recording.shareRecipients,
      adminAddress: params.recording.adminAddress,
      misoPackageId: params.misoPackageId,
      minatoPackageId: params.minatoPackageId,
    });
  };
}

// ============================================================================
// Release
// ============================================================================

export interface FinalizeReleaseParams extends ReleaseParts {
  /** Recipient of the `ReleaseAdminCap`. */
  adminAddress: string;
  misoPackageId: string;
}

/**
 * The opinionated finish for a release: publish (share) it and transfer its
 * admin cap to `adminAddress`.
 *
 * MUST run in the same PTB as the `createRelease` that produced these parts —
 * `Release` is `key`-only with no `drop`, so an unpublished release cannot
 * outlive its transaction. Splitting create from finalize is what lets a caller
 * do something else with the cap (route it to a vault, hand it to another
 * package, keep it for later commands) instead of a plain address transfer.
 */
export function finalizeRelease(tx: Transaction, params: FinalizeReleaseParams): void {
  tx.add(release.publish({ package: params.misoPackageId, arguments: [params.release, params.adminCap] }));
  tx.transferObjects([params.adminCap], tx.pure.address(params.adminAddress));
}

export interface TrackInput {
  recordingId: string;
  recordingAdminCapId: string;
  /** Share type of the recording (the deal/track `RecordingShare` phantom). */
  recordingShareType: string;
  /** Share type of the parent composition (the deal/track `CompositionShare` phantom). */
  compositionShareType: string;
  splitBps: number;
}

export interface PublishReleaseParams {
  title: string;
  /** The ordered tracklist. Display grouping (discs/sides) is extension data. */
  tracks: TrackInput[];
  releaseRegistryId: string;
  releaseId: string;
  releaseNonce: string;
  misoPackageId: string;
  adminAddress: string;
}

function buildTrackVec(
  tx: Transaction,
  misoPackageId: string,
  trackArgs: TransactionObjectArgument[],
) {
  return tx.makeMoveVec({ type: `${misoPackageId}::track::Track`, elements: trackArgs });
}

/**
 * Convenience: publish a release end-to-end, assembling its tracklist from
 * recording admin caps held by the sender (a deal is created inline per track).
 */
export function publishRelease(params: PublishReleaseParams): TxThunk {
  return (tx) => {
    const { misoPackageId } = params;
    const trackArgs = params.tracks.map((t) => {
      const typeArguments: [string, string] = [t.recordingShareType, t.compositionShareType];
      const dealArg = tx.add(
        deal._new({
          package: misoPackageId,
          typeArguments,
          arguments: [tx.object(t.recordingAdminCapId), tx.object(t.recordingId), tx.pure.id(params.releaseId), tx.pure.u16(t.splitBps)],
        }),
      );
      return tx.add(track._new({ package: misoPackageId, typeArguments, arguments: [dealArg, tx.object(t.recordingId)] }));
    });
    const parts = createRelease(
      tx,
      { title: params.title, nonce: params.releaseNonce, releaseRegistryId: params.releaseRegistryId, misoPackageId },
      buildTrackVec(tx, misoPackageId, trackArgs),
    );
    finalizeRelease(tx, { ...parts, adminAddress: params.adminAddress, misoPackageId });
  };
}

export interface DealInput {
  dealId: string;
  /** The recording the deal is for — `track::new` takes `&Recording` alongside the deal. */
  recordingId: string;
  /** Share type of the recording (the deal/track `RecordingShare` phantom). */
  recordingShareType: string;
  /** Share type of the parent composition (the deal/track `CompositionShare` phantom). */
  compositionShareType: string;
}

export interface PublishReleaseFromDealsParams {
  title: string;
  /** The ordered tracklist, one pre-made deal per track. */
  deals: DealInput[];
  releaseRegistryId: string;
  releaseNonce: string;
  misoPackageId: string;
  adminAddress: string;
}

/**
 * Convenience: publish a release end-to-end from pre-made `Deal`s held by the
 * sender (each deal already pins this release's id).
 */
export function publishReleaseFromDeals(params: PublishReleaseFromDealsParams): TxThunk {
  return (tx) => {
    const { misoPackageId } = params;
    const trackArgs = params.deals.map((dl) =>
      tx.add(track._new({
        package: misoPackageId,
        typeArguments: [dl.recordingShareType, dl.compositionShareType],
        arguments: [tx.object(dl.dealId), tx.object(dl.recordingId)],
      })),
    );
    const parts = createRelease(
      tx,
      { title: params.title, nonce: params.releaseNonce, releaseRegistryId: params.releaseRegistryId, misoPackageId },
      buildTrackVec(tx, misoPackageId, trackArgs),
    );
    finalizeRelease(tx, { ...parts, adminAddress: params.adminAddress, misoPackageId });
  };
}
