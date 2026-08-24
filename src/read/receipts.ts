// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// What one record sale actually was, read back from its transaction.
//
// The transaction digest is the receipt's identity: everything shown is
// re-derived from chain state, so a receipt link survives a refresh, a deep link,
// or a share to another device. `listing::buy` emits ONE `RecordSoldEvent` carrying
// the copy that was minted, its number in the run, and what the buyer paid.
//
// Two reads, in order, because a receipt is opened at two very different ages:
//   fullnode  the fresh path — usually the instant the transaction lands, possibly
//             before this node has it, hence `waitForTransaction`.
//   indexer   the old path — GraphQL keeps transactions the fullnode has pruned.
//             This is what makes a months-old receipt link still open.
//
// Where the money goes is PRESENTATIONAL, not a second on-chain fact: `buy`
// forwards the whole payment to the release's funds accumulator (there is no
// platform fee), and the royalty layer splits it downstream by the same terms this
// read walks. We show the buyer that arithmetic, in the same truncating integer
// math the chain does.

import * as listingContract from "../contracts/miso_pressing/listing.ts";
import {
  extractTypeParams2,
  getCompositionsByIds,
} from "@misonetwork/sdk";
import { normalizeStructTag, normalizeSuiAddress } from "@mysten/sui/utils";
import { getPressingDetail } from "./catalog.ts";
import type { MisoClient } from "./client.ts";
import { int, u64 } from "./internal/scalars.ts";
import type { Price, PressingDetail, PurchaseReceipt, RecordSale, TrackRoyalty } from "./types.ts";
import { getWorkAddressesByShareTypes } from "./works.ts";

const BPS = 10_000n;

/** `miso_pressing::listing::RecordSoldEvent<Currency>` — emitted by `listing::buy`. */
const RECORD_SOLD_EVENT_NAME = "listing::RecordSoldEvent";

/**
 * How long to wait for the fullnode to have the transaction before falling back
 * to the indexer. Propagation is p95 ~330ms, so this only ever runs long for a
 * digest the node genuinely doesn't have.
 */
const FULLNODE_WAIT_MS = 5_000;

/** Composition royalty rate (bps) per recording id. Sparse — an unresolved parent has no entry. */
type CompositionRates = Record<string, number | undefined>;

function coerceBigInt(v: unknown): bigint | null {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
  if (typeof v === "string" && /^\d+$/.test(v)) return BigInt(v);
  return null;
}

function priceFromUnknown(value: unknown): Price | null {
  if (!value || typeof value !== "object") return null;
  const variants = value as {
    $kind?: string;
    Fixed?: { amount?: unknown };
    Floor?: { amount?: unknown };
    fixed?: { amount?: unknown };
    floor?: { amount?: unknown };
  };
  const fixed = variants.$kind === "Fixed" || variants.Fixed != null || variants.fixed != null;
  const amount = coerceBigInt(
    fixed
      ? (variants.Fixed ?? variants.fixed)?.amount
      : (variants.Floor ?? variants.floor)?.amount,
  );
  return amount == null ? null : { kind: fixed ? "fixed" : "floor", amount: amount.toString() };
}

/**
 * The event's JSON projection — the fallback for transports that surface `json`
 * but no BCS. Field names are the Move ones (snake_case).
 */
function saleFromJson(
  json: Record<string, unknown>,
  currencyType: string,
): RecordSale | null {
  const number = coerceBigInt(json.number);
  const paid = coerceBigInt(json.paid);
  const recordId = json.record_id;
  const price = priceFromUnknown(json.price);
  if (number == null || paid == null || !price || typeof recordId !== "string") return null;
  return {
    listingId: typeof json.listing_id === "string" ? json.listing_id : "",
    pressingId: typeof json.pressing_id === "string" ? json.pressing_id : "",
    releaseId: typeof json.release_id === "string" ? json.release_id : "",
    recordId,
    number: number.toString(),
    paid: paid.toString(),
    price,
    currencyType,
    buyer: typeof json.buyer === "string" ? json.buyer : "",
  };
}

/**
 * Whether `eventType` is this deployment's `listing::RecordSoldEvent<Currency>`.
 *
 * Event BCS is structural, so a same-shaped event from another package must never
 * be decoded as a Miso sale. Normalize both package/type tags and require exactly
 * one (possibly nested) currency type argument.
 */
function recordSoldCurrencyType(
  eventType: string,
  misoPressingPackageId: string,
): string | null {
  let tag: string;
  try {
    tag = normalizeStructTag(eventType);
  } catch {
    return null;
  }

  const prefix = `${normalizeSuiAddress(misoPressingPackageId)}::${RECORD_SOLD_EVENT_NAME}`;
  if (!tag.startsWith(`${prefix}<`) || !tag.endsWith(">")) return null;

  const typeArgument = tag.slice(prefix.length + 1, -1);
  if (!typeArgument) return null;
  let depth = 0;
  for (const char of typeArgument) {
    if (char === "<") depth += 1;
    else if (char === ">") {
      depth -= 1;
      if (depth < 0) return null;
    } else if (char === "," && depth === 0) {
      return null;
    }
  }
  return depth === 0 ? typeArgument : null;
}

export function isRecordSoldEventType(
  eventType: string,
  misoPressingPackageId: string,
): boolean {
  return recordSoldCurrencyType(eventType, misoPressingPackageId) !== null;
}

/**
 * The sale a transaction recorded, or null if it emitted none. BCS is the stable
 * shape (a JSON projection's field names vary by transport), so it is tried first.
 */
export function findRecordSale(
  events: {
    eventType: string;
    bcs: Uint8Array;
    json: Record<string, unknown> | null;
  }[],
  misoPressingPackageId: string,
): RecordSale | null {
  for (const e of events) {
    const currencyType = recordSoldCurrencyType(
      e.eventType,
      misoPressingPackageId,
    );
    if (!currencyType) continue;
    try {
      // The generated struct decodes addresses to 0x-hex and u64s to decimal strings.
      const s = listingContract.RecordSoldEvent.parse(e.bcs);
      const price = priceFromUnknown(s.price);
      if (!price) continue;
      return {
        listingId: s.listing_id,
        pressingId: s.pressing_id,
        releaseId: s.release_id,
        recordId: s.record_id,
        number: u64(s.number),
        paid: u64(s.paid),
        price,
        currencyType,
        buyer: s.buyer,
      };
    } catch {
      // Unparseable BCS (or none surfaced) — fall through to the JSON view.
    }
    const fromJson = e.json && saleFromJson(e.json, currencyType);
    if (fromJson) return fromJson;
  }
  return null;
}

/** The sale, read from the fullnode. */
async function saleFromFullnode(client: MisoClient, txDigest: string): Promise<RecordSale> {
  const result = await client.sui.waitForTransaction({
    digest: txDigest,
    include: { events: true },
    timeout: FULLNODE_WAIT_MS,
  });
  if (result.$kind !== "Transaction" || !result.Transaction.status.success) {
    throw new Error(`Transaction did not succeed: ${txDigest}`);
  }
  const sale = findRecordSale(
    result.Transaction.events,
    client.config.protocol.pressing,
  );
  if (!sale) throw new Error(`No record purchase in transaction ${txDigest}`);
  return sale;
}

const TX_EVENTS_QUERY = `query TransactionEvents($digest: String!) {
  transaction(digest: $digest) {
    effects {
      status
      events { nodes { contents { type { repr } json } } }
    }
  }
}`;

interface TxEventsResult {
  transaction: {
    effects: {
      status: string;
      events: { nodes: { contents: { type: { repr: string }; json: unknown } | null }[] } | null;
    } | null;
  } | null;
}

/** The sale, read from the GraphQL indexer — the path for a pruned transaction. */
async function saleFromIndexer(client: MisoClient, txDigest: string): Promise<RecordSale> {
  const { data, errors } = await client.graphqlRaw.query<TxEventsResult, { digest: string }>({
    query: TX_EVENTS_QUERY,
    variables: { digest: txDigest },
  });
  if (errors?.length) throw new Error(errors[0]!.message);

  const effects = data?.transaction?.effects;
  if (!effects) throw new Error(`Transaction not found: ${txDigest}`);
  if (effects.status !== "SUCCESS") throw new Error(`Transaction did not succeed: ${txDigest}`);

  for (const node of effects.events?.nodes ?? []) {
    const contents = node.contents;
    if (!contents) continue;
    const currencyType = recordSoldCurrencyType(
      contents.type.repr,
      client.config.protocol.pressing,
    );
    if (!currencyType) continue;
    const sale =
      typeof contents.json === "object" && contents.json !== null
        ? saleFromJson(contents.json as Record<string, unknown>, currencyType)
        : null;
    if (sale) return sale;
  }
  throw new Error(`No record purchase in transaction ${txDigest}`);
}

/**
 * Each recording's parent composition royalty rate, in basis points, keyed by
 * recording id.
 *
 * A `Recording<RecordingShare, CompositionShare>` names its parent by SHARE TYPE,
 * not by id, so the hop is: recording type tag → composition share type →
 * (GraphQL) composition id → (Core) the composition's `royaltyRate`.
 *
 * Best-effort by design: any failure returns the rates resolved so far, and the
 * receipt drops to a track-level breakdown rather than failing the whole page.
 */
async function compositionRatesByRecording(client: MisoClient, recordingIds: string[]): Promise<CompositionRates> {
  if (recordingIds.length === 0) return {};

  const shareTypeByRecording: Record<string, string> = {};
  const { objects } = await client.protocol.core.getObjects({ objectIds: [...new Set(recordingIds)] });
  for (const obj of objects) {
    if (obj instanceof Error || !obj.type) continue;
    try {
      const [, compositionShareType] = extractTypeParams2(obj.type);
      shareTypeByRecording[obj.objectId] = compositionShareType;
    } catch {
      // A recording type we can't read the parent off — skip this track.
    }
  }

  const shareTypes = Object.values(shareTypeByRecording);
  if (shareTypes.length === 0) return {};

  const addresses = await getWorkAddressesByShareTypes(
    client.graphql,
    { compositions: shareTypes, recordings: [] },
    client.config.deployment.miso,
  );
  const compositionIds = Object.values(addresses.compositions).filter((id): id is string => !!id);
  const compositions = await getCompositionsByIds(client.protocol, compositionIds);

  const rates: CompositionRates = {};
  for (const [recordingId, shareType] of Object.entries(shareTypeByRecording)) {
    const compositionId = addresses.compositions[shareType];
    const composition = compositionId ? compositions[compositionId] : undefined;
    if (composition) rates[recordingId] = int(composition.royaltyRate.value);
  }
  return rates;
}

/**
 * Split `paid` across the release's tracks by their `splitBps`, then split each
 * track's share between its composition and its recording. All BigInt — the same
 * truncating integer math the on-chain royalty layer does, so the numbers shown
 * are the numbers paid.
 */
export function breakdown(
  tracks: PressingDetail["release"]["tracks"],
  paid: string,
  compositionRates: CompositionRates,
): TrackRoyalty[] {
  const paidUnits = BigInt(paid);
  return tracks.map((track) => {
    const amount = (paidUnits * BigInt(track.splitBps)) / BPS;
    const rate = compositionRates[track.recordingId];
    const base = {
      no: track.no,
      title: track.title,
      recordingId: track.recordingId,
      splitBps: track.splitBps,
      amount: amount.toString(),
    };
    if (rate == null) return { ...base, composition: null, recording: null };
    const composition = (amount * BigInt(rate)) / BPS;
    return { ...base, composition: composition.toString(), recording: (amount - composition).toString() };
  });
}

/**
 * The receipt for `txDigest`. The event identifies the exact immutable Pressing
 * and Listing; callers cannot accidentally reinterpret a Pressing id as an
 * obsolete sale-object id.
 *
 * The sale identifies the Pressing before its detail is fetched. `null` only when
 * that immutable Pressing cannot be read; it is never superseded or destroyed.
 */
export async function getPurchaseReceipt(
  client: MisoClient,
  txDigest: string,
): Promise<PurchaseReceipt | null> {
  const sale = await saleFromFullnode(client, txDigest).catch(() =>
    saleFromIndexer(client, txDigest),
  );
  const detail = await getPressingDetail(client, sale.pressingId);
  if (!detail) return null;

  // Best-effort: a failed composition lookup costs the sub-rows, not the page.
  const rates = await compositionRatesByRecording(
    client,
    detail.release.tracks.map((t) => t.recordingId),
  ).catch(() => ({}));

  return {
    sale,
    detail,
    price: sale.price.amount,
    tracks: breakdown(detail.release.tracks, sale.paid, rates),
  };
}
