// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Single-PTB publisher for a whole release graph: creates every composition and
// recording, optionally attaches royalty pools, derives the release id ON-CHAIN
// (so recordings need not be shared first), builds the deals/tracks/release,
// then shares everything and transfers the admin caps — all in ONE transaction.
//
// Share currencies must already be published + initialized (their Currency objects
// shared on-chain); their ids/types are passed in. Ordering is load-bearing:
//   1. composition::new → recording::new(&comp)  (borrow-before-share) + pool attach
//   2. release::derive_release_id(<recording::id results>) → deal::new(cap, &rec,
//      derivedId, split) → track::new → release::new
//   3. publish (share) comps + recs + release, disperse supply, transfer caps
// Steps 1–2 borrow the works; step 3 consumes them into share_object.
//
// Release tracks come in three shapes (see TrackNode): recordings created in
// THIS PTB, existing recordings authorized by their admin cap (deal created
// inline), and existing recordings authorized by a pre-made Deal in hand.
// Pre-made deals pin the release id, so they cannot coexist with fresh
// recordings — the builder rejects that mix up front.
//
// This is the whole-graph orchestration half of the opinionated publish flow —
// it composes `@misonetwork/sdk`'s bare `composition`/`recording`/`deal`/`track`/
// `release` call bindings, its `createRelease` primitive and
// `attachCompositionRoyaltyPool`/`attachRecordingRoyaltyPool`, plus this
// package's own `disperseShares`/`finalizeRelease`, into one PTB.

import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";
import {
  contracts,
  attachCompositionRoyaltyPool,
  attachRecordingRoyaltyPool,
  createRelease,
  PROTOCOL_MAX_ROYALTY_RATE_BPS,
} from "@misonetwork/sdk";
import { disperseShares, finalizeRelease, type ShareRecipient } from "./transactions.ts";

const { composition, recording, deal, track, release } = contracts;

/** A royalty pool to attach to a work, in the same PTB. */
export interface RoyaltyPoolNode {
  currency: string;
  /** `composition_royalty_pool` / `recording_royalty_pool` package id. */
  extensionPackageId: string;
  /** Base `royalty_pool` lib package id. */
  royaltyPoolPackageId: string;
}

export interface CompositionNode {
  shareType: string;
  shareCurrencyId: string;
  shareTreasuryCapId: string;
  title: string;
  royaltyRateBps: number;
  shareRecipients: ShareRecipient[];
  /** Recipient of the CompositionAdminCap (the owner). */
  adminAddress: string;
  royaltyPool?: RoyaltyPoolNode;
}

export interface RecordingNode {
  shareType: string;
  shareCurrencyId: string;
  shareTreasuryCapId: string;
  /** The parent composition's share type. */
  compositionShareType: string;
  /** Index into `compositions[]` if the parent is created in THIS PTB… */
  parentCompositionIndex?: number;
  /** …or the on-chain composition object id if the parent already exists. */
  parentCompositionId?: string;
  shareRecipients: ShareRecipient[];
  adminAddress: string;
  /**
   * Slippage guard for `recording::new` against an EXISTING on-chain parent —
   * pass the composition rate you observed (default: protocol max). Ignored for
   * parents created in this PTB, whose exact known rate is pinned automatically.
   */
  maxRoyaltyRateBps?: number;
  royaltyPool?: RoyaltyPoolNode;
}

/** A track whose recording is created in THIS PTB (its deal is created inline). */
export interface FreshTrackNode {
  /** Index into `recordings[]`. */
  recordingIndex: number;
  splitBps: number;
}

/**
 * A track over an EXISTING recording, authorized by its admin cap (held by the
 * sender) — the deal is created inline against the on-chain-derived release id.
 * This is the only way to mix existing recordings with ones created in this PTB.
 */
export interface CapTrackNode {
  recordingId: string;
  recordingAdminCapId: string;
  recordingShareType: string;
  compositionShareType: string;
  splitBps: number;
}

/**
 * A track over an EXISTING recording, authorized by a pre-made `Deal` held by
 * the sender. A deal pins the exact release id — a digest over ALL track
 * recording ids — so deal-backed tracks cannot coexist with `FreshTrackNode`s
 * (a fresh recording's id is unknowable when the deal was created).
 * `splitBps` must be the value stored in the deal (read it from the object).
 */
export interface DealTrackNode {
  dealId: string;
  recordingId: string;
  recordingShareType: string;
  compositionShareType: string;
  splitBps: number;
}

export type TrackNode = FreshTrackNode | CapTrackNode | DealTrackNode;

const isFresh = (t: TrackNode): t is FreshTrackNode => "recordingIndex" in t;
const isDealBacked = (t: TrackNode): t is DealTrackNode => "dealId" in t;

export interface ReleaseNode {
  title: string;
  /** u256 nonce as a decimal string (deterministic release id). */
  nonce: string;
  adminAddress: string;
  releaseRegistryId: string;
  /** The ordered tracklist. Display grouping (discs/sides) is extension data. */
  tracks: TrackNode[];
}

export interface PublishReleaseGraphParams {
  compositions: CompositionNode[];
  recordings: RecordingNode[];
  release?: ReleaseNode;
  misoPackageId: string;
  minatoPackageId: string;
}

interface Parts {
  work: TransactionObjectArgument;
  adminCap: TransactionObjectArgument;
  balance: TransactionObjectArgument;
}

/** Builds the entire graph in a single transaction (see file header for ordering). */
export function publishReleaseGraph(params: PublishReleaseGraphParams): (tx: Transaction) => void {
  const { misoPackageId: pkg, minatoPackageId } = params;
  return (tx) => {
    // ── 1) Create every composition, then every recording (borrow-before-share) ──
    const comps: Parts[] = params.compositions.map((c) => {
      const r = tx.add(
        composition._new({
          package: pkg,
          typeArguments: [c.shareType],
          arguments: [tx.pure.string(c.title), tx.pure.u16(c.royaltyRateBps), tx.object(c.shareCurrencyId), tx.object(c.shareTreasuryCapId)],
        }),
      );
      const parts: Parts = { work: r[0]!, adminCap: r[1]!, balance: r[2]! };
      if (c.royaltyPool) {
        attachCompositionRoyaltyPool(tx, {
          composition: parts.work,
          adminCap: parts.adminCap,
          compositionShareType: c.shareType,
          currency: c.royaltyPool.currency,
          compositionRoyaltyPoolPackageId: c.royaltyPool.extensionPackageId,
          royaltyPoolPackageId: c.royaltyPool.royaltyPoolPackageId,
        });
      }
      return parts;
    });

    const recTypeArgs = (i: number): [string, string] => {
      const n = params.recordings[i]!;
      return [n.shareType, n.compositionShareType];
    };

    const recs: Parts[] = params.recordings.map((rec, i) => {
      const parent = rec.parentCompositionIndex !== undefined ? comps[rec.parentCompositionIndex]!.work : tx.object(rec.parentCompositionId!);
      // Slippage guard: a parent created in this PTB has a known rate — pin it
      // exactly. An existing parent uses the caller's observed rate (or accepts
      // up to the protocol max).
      const maxRoyaltyRateBps =
        rec.parentCompositionIndex !== undefined
          ? params.compositions[rec.parentCompositionIndex]!.royaltyRateBps
          : (rec.maxRoyaltyRateBps ?? PROTOCOL_MAX_ROYALTY_RATE_BPS);
      const typeArgs = recTypeArgs(i);
      const r = tx.add(
        recording._new({ package: pkg, typeArguments: typeArgs, arguments: [parent, tx.object(rec.shareCurrencyId), tx.object(rec.shareTreasuryCapId), tx.pure.u16(maxRoyaltyRateBps)] }),
      );
      const parts: Parts = { work: r[0]!, adminCap: r[1]!, balance: r[2]! };
      if (rec.royaltyPool) {
        attachRecordingRoyaltyPool(tx, {
          recording: parts.work,
          adminCap: parts.adminCap,
          recordingShareType: rec.shareType,
          compositionShareType: rec.compositionShareType,
          currency: rec.royaltyPool.currency,
          recordingRoyaltyPoolPackageId: rec.royaltyPool.extensionPackageId,
          royaltyPoolPackageId: rec.royaltyPool.royaltyPoolPackageId,
        });
      }
      return parts;
    });

    // ── 2) Release: derive the id on-chain, then deals → tracks → release ──
    if (params.release) {
      const rel = params.release;
      const ordered = rel.tracks;
      if (ordered.some(isDealBacked) && ordered.some(isFresh)) {
        throw new Error(
          "A release cannot mix pre-made deals with recordings created in this transaction: " +
            "a deal pins the exact release id, whose digest includes every track's recording id, " +
            "and a fresh recording's id is unknowable when the deal was created. " +
            "Authorize the existing recordings with their admin caps instead.",
        );
      }

      // The derived id feeds the deals created inline (fresh/cap-backed tracks).
      // Pre-made deals already store it, so an all-deal release skips the derive.
      let releaseId: TransactionObjectArgument | undefined;
      if (!ordered.every(isDealBacked)) {
        const idVec = tx.makeMoveVec({
          type: "0x2::object::ID",
          elements: ordered.map((t) =>
            isFresh(t)
              ? tx.add(recording.id({ package: pkg, typeArguments: recTypeArgs(t.recordingIndex), arguments: [recs[t.recordingIndex]!.work] }))
              : tx.pure.id(t.recordingId),
          ),
        });
        const splitVec = tx.makeMoveVec({ type: "u64", elements: ordered.map((t) => tx.pure.u64(t.splitBps)) });
        releaseId = tx.add(
          release.deriveReleaseId({ package: pkg, arguments: [idVec, splitVec, tx.pure.u256(BigInt(rel.nonce)), tx.object(rel.releaseRegistryId)] }),
        );
      }

      const trackArgs = ordered.map((t) => {
        if (isDealBacked(t)) {
          const typeArgs: [string, string] = [t.recordingShareType, t.compositionShareType];
          return tx.add(track._new({ package: pkg, typeArguments: typeArgs, arguments: [tx.object(t.dealId), tx.object(t.recordingId)] }));
        }
        if (isFresh(t)) {
          const typeArgs = recTypeArgs(t.recordingIndex);
          const parts = recs[t.recordingIndex]!;
          const dealArg = tx.add(deal._new({ package: pkg, typeArguments: typeArgs, arguments: [parts.adminCap, parts.work, releaseId!, tx.pure.u16(t.splitBps)] }));
          return tx.add(track._new({ package: pkg, typeArguments: typeArgs, arguments: [dealArg, parts.work] }));
        }
        const typeArgs: [string, string] = [t.recordingShareType, t.compositionShareType];
        const rec = tx.object(t.recordingId);
        const dealArg = tx.add(
          deal._new({ package: pkg, typeArguments: typeArgs, arguments: [tx.object(t.recordingAdminCapId), rec, releaseId!, tx.pure.u16(t.splitBps)] }),
        );
        return tx.add(track._new({ package: pkg, typeArguments: typeArgs, arguments: [dealArg, rec] }));
      });
      const trackVec = tx.makeMoveVec({ type: `${pkg}::track::Track`, elements: trackArgs });
      const releaseParts = createRelease(
        tx,
        { title: rel.title, nonce: rel.nonce, releaseRegistryId: rel.releaseRegistryId, misoPackageId: pkg },
        trackVec,
      );
      finalizeRelease(tx, { ...releaseParts, adminAddress: rel.adminAddress, misoPackageId: pkg });
    }

    // ── 3) Share every work, disperse its supply, transfer admin caps ──
    params.compositions.forEach((c, i) => {
      const parts = comps[i]!;
      disperseShares(tx, minatoPackageId, c.shareType, parts.balance, c.shareRecipients);
      tx.add(composition.publish({ package: pkg, typeArguments: [c.shareType], arguments: [parts.work, parts.adminCap] }));
      tx.transferObjects([parts.adminCap], c.adminAddress);
    });
    params.recordings.forEach((rec, i) => {
      const parts = recs[i]!;
      tx.add(recording.publish({ package: pkg, typeArguments: recTypeArgs(i), arguments: [parts.work, parts.adminCap] }));
      disperseShares(tx, minatoPackageId, rec.shareType, parts.balance, rec.shareRecipients);
      tx.transferObjects([parts.adminCap], rec.adminAddress);
    });
  };
}
