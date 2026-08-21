// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Single-PTB publisher for a whole release graph: creates every composition and
// recording, derives the release id ON-CHAIN
// (so recordings need not be shared first), builds the tracks/release,
// then shares everything and transfers the admin caps — all in ONE transaction.
//
// Share currencies must already be published + initialized (their Currency objects
// shared on-chain); their ids/types are passed in. Ordering is load-bearing:
//   1. composition::new → recording::new(&comp)  (borrow-before-share)
//   2. release::derive_target_release_id(<recording::id results>) →
//      track::new(cap, &rec, derivedId, split) → release::new(registry, …)
//   3. publish (share) comps + recs + release, disperse supply, transfer caps
// Steps 1–2 borrow the works; step 3 consumes them into share_object.
//
// Release tracks come in two shapes (see TrackNode): recordings created in THIS
// PTB, and existing recordings authorized by their admin cap.
//
// This is the whole-graph orchestration half of the opinionated publish flow —
// it composes `@misonetwork/sdk`'s bare `composition`/`recording`/`track`/
// `release` core call bindings with its
// own `disperseShares`/`finalizeRelease` helpers into one PTB. Royalty pools are
// installed later through an admin-cap Vault plugin; the retired raw-cap helper
// is intentionally not used here.

import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";
import { contracts } from "@misonetwork/sdk";
import { disperseShares, finalizeRelease, type ShareRecipient } from "./transactions.ts";
import { directAdminCap, disposeNewAdminCap, type AdminCapAuthority, type AdminCapCustody, withAdminCap } from "./vault.ts";

const { composition, recording, track } = contracts;

export interface CompositionNode {
  shareType: string;
  shareCurrencyId: string;
  shareTreasuryCapId: string;
  title: string;
  royaltyRateBps: number;
  shareRecipients: ShareRecipient[];
  /** Explicit direct delivery or Vault custody for the CompositionAdminCap. */
  adminCustody?: AdminCapCustody;
  /** @deprecated Pass explicit `adminCustody`. */
  adminAddress?: string;
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
  adminCustody?: AdminCapCustody;
  /** @deprecated Pass explicit `adminCustody`. */
  adminAddress?: string;
}

/** A track whose recording is created in THIS PTB. */
export interface FreshTrackNode {
  /** Index into `recordings[]`. */
  recordingIndex: number;
  splitBps: number;
}

/**
 * A track over an EXISTING recording, authorized by its admin cap held by the
 * sender. This can coexist with recordings created in this PTB.
 */
export interface CapTrackNode {
  recordingId: string;
  recordingAuthority?: AdminCapAuthority;
  /** @deprecated Pass explicit `recordingAuthority`. */
  recordingAdminCapId?: string;
  recordingShareType: string;
  compositionShareType: string;
  splitBps: number;
}

export type TrackNode = FreshTrackNode | CapTrackNode;

const isFresh = (t: TrackNode): t is FreshTrackNode => "recordingIndex" in t;

export interface ReleaseNode {
  title: string;
  /** u256 nonce as a decimal string (deterministic release id). */
  nonce: string;
  adminCustody?: AdminCapCustody;
  /** @deprecated Pass explicit `adminCustody`. */
  adminAddress?: string;
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
      return parts;
    });

    const recTypeArgs = (i: number): [string, string] => {
      const n = params.recordings[i]!;
      return [n.shareType, n.compositionShareType];
    };

    const recs: Parts[] = params.recordings.map((rec, i) => {
      const parent = rec.parentCompositionIndex !== undefined ? comps[rec.parentCompositionIndex]!.work : tx.object(rec.parentCompositionId!);
      const typeArgs = recTypeArgs(i);
      const r = tx.add(
        recording._new({ package: pkg, typeArguments: typeArgs, arguments: [parent, tx.object(rec.shareCurrencyId), tx.object(rec.shareTreasuryCapId)] }),
      );
      const parts: Parts = { work: r[0]!, adminCap: r[1]!, balance: r[2]! };
      return parts;
    });

    // ── 2) Release: derive the id on-chain, then tracks → release ──────────
    if (params.release) {
      const rel = params.release;
      const ordered = rel.tracks;
      const idVec = tx.makeMoveVec({
        type: "0x2::object::ID",
        elements: ordered.map((t) =>
          isFresh(t)
            ? tx.add(recording.id({ package: pkg, typeArguments: recTypeArgs(t.recordingIndex), arguments: [recs[t.recordingIndex]!.work] }))
            : tx.pure.id(t.recordingId),
        ),
      });
      const splitVec = tx.makeMoveVec({ type: "u64", elements: ordered.map((t) => tx.pure.u64(t.splitBps)) });
      // This returns an ID value (not an object); pass the result straight to
      // `track::new` so every track consents to this exact release target.
      const releaseId = tx.moveCall({
        target: `${pkg}::release::derive_target_release_id`,
        arguments: [tx.object(rel.releaseRegistryId), idVec, splitVec, tx.pure.u256(BigInt(rel.nonce))],
      });

      const trackArgs = ordered.map((t) => {
        if (isFresh(t)) {
          const typeArgs = recTypeArgs(t.recordingIndex);
          const parts = recs[t.recordingIndex]!;
          return tx.add(track._new({ package: pkg, typeArguments: typeArgs, arguments: [parts.adminCap, parts.work, releaseId, tx.pure.u16(t.splitBps)] }));
        }
        const typeArgs: [string, string] = [t.recordingShareType, t.compositionShareType];
        const rec = tx.object(t.recordingId);
        let trackValue: TransactionObjectArgument | undefined;
        withAdminCap(tx, t.recordingAuthority ?? directAdminCap(t.recordingAdminCapId!), (adminCap) => {
          trackValue = tx.add(track._new({ package: pkg, typeArguments: typeArgs, arguments: [adminCap, rec, releaseId, tx.pure.u16(t.splitBps)] }));
        });
        return trackValue!;
      });
      const trackVec = tx.makeMoveVec({ type: `${pkg}::track::Track`, elements: trackArgs });
      const created = tx.moveCall({
        target: `${pkg}::release::new`,
        arguments: [tx.object(rel.releaseRegistryId), tx.pure.string(rel.title), trackVec, tx.pure.u256(BigInt(rel.nonce))],
      });
      const releaseParts = { release: created[0]!, adminCap: created[1]! };
      finalizeRelease(tx, { ...releaseParts, adminCustody: rel.adminCustody, adminAddress: rel.adminAddress, misoPackageId: pkg });
    }

    // ── 3) Share every work, disperse its supply, transfer admin caps ──
    params.compositions.forEach((c, i) => {
      const parts = comps[i]!;
      disperseShares(tx, minatoPackageId, c.shareType, parts.balance, c.shareRecipients);
      tx.add(composition.publish({ package: pkg, typeArguments: [c.shareType], arguments: [parts.work, parts.adminCap] }));
      disposeNewAdminCap(tx, parts.adminCap, c.adminCustody ?? { kind: "direct", owner: c.adminAddress! });
    });
    params.recordings.forEach((rec, i) => {
      const parts = recs[i]!;
      tx.add(recording.publish({ package: pkg, typeArguments: recTypeArgs(i), arguments: [parts.work, parts.adminCap] }));
      disperseShares(tx, minatoPackageId, rec.shareType, parts.balance, rec.shareRecipients);
      disposeNewAdminCap(tx, parts.adminCap, rec.adminCustody ?? { kind: "direct", owner: rec.adminAddress! });
    });
  };
}
