// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Address-scoped reads: what a wallet owns, administers, and can spend.
//
// None of this is cacheable at a shared edge — every answer is different per
// address — but it belongs here anyway, because the VALUE of a single read layer
// is the response shape, not just the cache. The studio catalog's three-transport
// dance (owned caps over gRPC → share types over GraphQL → work contents over
// gRPC) is exactly the sort of thing that should exist once in the SDK rather
// than be reimplemented by every browser, Worker, server, or native client.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  contracts as networkContracts,
  getCompositionByShareType,
  getOwnedReleaseAdminCaps,
  getRecordingByShareType,
  getReleaseById,
  isNotFound,
} from "@misonetwork/sdk";
import type { MisoClient } from "./client.ts";
import { int, u64 } from "./internal/scalars.ts";
import type {
  Balance,
  OwnedParty,
  OwnedRecord,
  OwnedWork,
  Ownership,
  PendingMembership,
  WorkDetail,
} from "./types.ts";
import { getRecordingTitles, getWorkAddressesByShareTypes, getWorksByIds } from "./works.ts";

/**
 * Page cap on the owned-objects scan, so a wallet holding a huge unrelated object
 * set can't spin forever. 50/page × 20 = 1000 objects — far beyond any realistic
 * library.
 */
const MAX_PAGES = 20;

// ── Records ──────────────────────────────────────────────────────────────────

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/**
 * This copy's number in its run. Fresh records expose the canonical
 * `{ release_id, number }` shape; pre-publish layouts are intentionally not
 * accepted by the pre-launch SDK.
 */
function readRecordNumber(json: Record<string, unknown>): number | null {
  return coerceNumber(json.number);
}

function readReleaseId(json: Record<string, unknown>): string | null {
  const r = json.release_id;
  return typeof r === "string" && r ? r : null;
}

/**
 * The records `owner` holds. Ownership is DIRECT — a record is an address-owned
 * `<miso_record>::record::Record` with no pressing/license/receipt intermediary.
 * The server-side type filter and exact local check deliberately exclude records
 * from any retired package namespace.
 */
export async function getOwnedRecords(client: MisoClient, owner: string): Promise<OwnedRecord[]> {
  const out: OwnedRecord[] = [];
  let cursor: string | null = null;
  const recordType = `${client.config.protocol.record}::record::Record`;

  for (let page = 0; page < MAX_PAGES; page++) {
    // Annotated: `cursor` is both an input and assigned from the result, which
    // TypeScript reads as a circular initializer without an explicit type.
    const res: Awaited<ReturnType<typeof client.protocol.core.listOwnedObjects>> =
      await client.protocol.core.listOwnedObjects({
        owner,
        type: recordType,
        cursor,
        limit: 50,
        include: { json: true },
      });
    for (const obj of res.objects) {
      if (obj.type !== recordType) continue;
      const json = (obj.json ?? {}) as Record<string, unknown>;
      out.push({
        id: obj.objectId,
        type: obj.type,
        releaseId: readReleaseId(json),
        number: readRecordNumber(json),
      });
    }
    if (!res.hasNextPage) break;
    cursor = res.cursor;
    if (!cursor) break;
  }
  return out;
}

// ── Parties ──────────────────────────────────────────────────────────────────

/**
 * The parties `owner` administers. A wallet "owns" a party iff it holds the
 * party's `PartyAdminCap`, so this is one owned-objects listing filtered to the
 * cap type plus a name resolve. Caps are transferable, which is why this is
 * authoritative in a way that remembering created parties client-side is not.
 */
export async function getOwnedParties(client: MisoClient, owner: string): Promise<OwnedParty[]> {
  const capType = `${client.config.deployment.misoParty}::party::PartyAdminCap`;

  // One page of 50 caps is plenty for launch-scale artists; paginate if labels
  // ever start hitting the cap.
  const { objects } = await client.protocol.core.listOwnedObjects({
    owner,
    type: capType,
    limit: 50,
    include: { content: true },
  });

  const caps = objects.flatMap((obj) => {
    try {
      const cap = networkContracts.party.PartyAdminCap.parse(obj.content);
      return [{ capId: obj.objectId, partyId: cap.party_id }];
    } catch {
      return [];
    }
  });
  if (caps.length === 0) return [];

  const parties = await client.sui.miso.party.getPartiesByIds(caps.map((c) => c.partyId));
  return caps.flatMap(({ capId, partyId }) => {
    const p = parties[partyId];
    return p ? [{ partyId, capId, name: p.name, kind: p.kind }] : [];
  });
}

/**
 * Pending group invitations for every individual party the wallet administers.
 *
 * The Party module maintains a member-side pending-membership index, so this
 * reads only the wallet's controlled parties — never a global event scan. Group
 * names are resolved in one batch so the API can render an inbox without extra
 * browser reads.
 */
export async function getPendingMemberships(
  client: MisoClient,
  owner: string,
): Promise<PendingMembership[]> {
  const controlled = await getOwnedParties(client, owner);
  const individuals = controlled.filter((party) => party.kind === "individual");
  if (individuals.length === 0) return [];

  const invitations = await Promise.all(
    individuals.map(async (member) => ({
      member,
      groupIds: await client.sui.miso.party.getPendingMemberships(member.partyId),
    })),
  );
  const groupIds = [...new Set(invitations.flatMap(({ groupIds }) => groupIds))];
  if (groupIds.length === 0) return [];

  const groups = await client.sui.miso.party.getPartiesByIds(groupIds);
  return invitations.flatMap(({ member, groupIds }) =>
    groupIds.flatMap((groupId): PendingMembership[] => {
      const group = groups[groupId];
      return group?.kind === "group"
        ? [{ memberPartyId: member.partyId, memberCapId: member.capId, groupId, groupName: group.name }]
        : [];
    }),
  );
}

// ── Works (studio catalog) ───────────────────────────────────────────────────

/**
 * Owned generic admin caps over gRPC. The bare type filter matches every
 * instantiation of `CompositionAdminCap<T>` / `RecordingAdminCap<T>`; the share
 * type `T` is parsed back out of each instance's type tag, because the cap does
 * not store the work's id — only its share type.
 */
async function ownedGenericCaps(client: MisoClient, owner: string, capType: string) {
  const { objects } = await client.protocol.core.listOwnedObjects({ owner, type: capType, limit: 50 });
  const caps: { id: string; shareType: string }[] = [];
  for (const obj of objects) {
    const match = /<(.+)>$/.exec(obj.type);
    if (match?.[1]) caps.push({ id: obj.objectId, shareType: match[1] });
  }
  return caps;
}

/**
 * Every work the wallet administers, keyed by its ADMIN CAP id (the studio
 * catalog's routing unit — caps are what control means here).
 *
 * Three transports, one answer: cap discovery is gRPC; one aliased GraphQL
 * request maps every share type to its work address (gRPC cannot ask "which
 * object has type X"); one gRPC batch loads all the work contents. Releases skip
 * the GraphQL hop entirely — `ReleaseAdminCap` is not generic and carries
 * `release_id` directly.
 */
export async function getOwnedWorks(client: MisoClient, owner: string): Promise<OwnedWork[]> {
  const miso = client.config.deployment.miso;

  const [compCaps, recCaps, relCaps] = await Promise.all([
    ownedGenericCaps(client, owner, `${miso}::composition::CompositionAdminCap`),
    ownedGenericCaps(client, owner, `${miso}::recording::RecordingAdminCap`),
    getOwnedReleaseAdminCaps(client.protocol, owner, miso),
  ]);

  const addresses = await getWorkAddressesByShareTypes(
    client.graphql,
    { compositions: compCaps.map((c) => c.shareType), recordings: recCaps.map((c) => c.shareType) },
    miso,
  );
  const works = await getWorksByIds(client.protocol, {
    compositions: Object.values(addresses.compositions).filter((id): id is string => id !== undefined),
    recordings: Object.values(addresses.recordings).filter((id): id is string => id !== undefined),
    releases: relCaps.map((c) => c.releaseId),
  });
  const recordingTitles = await getRecordingTitles(
    client.protocol,
    client.graphql,
    Object.values(addresses.recordings).filter((id): id is string => id !== undefined),
    miso,
  );

  const comps = compCaps.flatMap((cap): OwnedWork[] => {
    const workId = addresses.compositions[cap.shareType];
    const composition = workId ? works.compositions[workId] : undefined;
    if (!workId || !composition) return [];
    return [{ capId: cap.id, kind: "composition", workId, title: composition.title, state: composition.state.type }];
  });
  const recs = recCaps.flatMap((cap): OwnedWork[] => {
    const workId = addresses.recordings[cap.shareType];
    const recording = workId ? works.recordings[workId] : undefined;
    if (!workId || !recording) return [];
    return [{
      capId: cap.id,
      kind: "recording",
      workId,
      title: recordingTitles[workId] ?? "Untitled",
      state: recording.state.type,
    }];
  });
  const rels = relCaps.flatMap((cap): OwnedWork[] => {
    const release = works.releases[cap.releaseId];
    if (!release) return [];
    return [{ capId: cap.id, kind: "release", workId: release.id, title: release.title, state: release.state.type }];
  });

  return [...comps, ...recs, ...rels];
}

/** Classify a cap by its on-chain type, then resolve the work behind it. */
export async function getWorkByCap(client: MisoClient, capId: string): Promise<WorkDetail | null> {
  const miso = client.config.deployment.miso;

  let type: string;
  let json: Record<string, unknown> | null;
  try {
    const { object } = await client.protocol.core.getObject({ objectId: capId, include: { json: true } });
    type = object.type;
    json = (object.json ?? null) as Record<string, unknown> | null;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }

  if (type.startsWith(`${miso}::composition::CompositionAdminCap<`)) {
    const shareType = type.slice(type.indexOf("<") + 1, -1);
    const c = await getCompositionByShareType(client.protocol, client.graphql, shareType, miso);
    return {
      capId,
      kind: "composition",
      workId: c.id,
      title: c.title,
      state: c.state.type,
      royaltyRateBps: int(c.royaltyRate.value),
      shareType,
    };
  }

  if (type.startsWith(`${miso}::recording::RecordingAdminCap<`)) {
    const shareType = type.slice(type.indexOf("<") + 1, -1);
    const r = await getRecordingByShareType(client.protocol, client.graphql, shareType, miso);
    const titles = await getRecordingTitles(client.protocol, client.graphql, [r.id], miso);
    return {
      capId,
      kind: "recording",
      workId: r.id,
      title: titles[r.id] ?? "Untitled",
      state: r.state.type,
      shareType,
    };
  }

  if (type.startsWith(`${miso}::release::ReleaseAdminCap`)) {
    const releaseId = typeof json?.release_id === "string" ? json.release_id : null;
    if (!releaseId) throw new Error(`Release cap ${capId} carries no release id`);
    const r = await getReleaseById(client.protocol, releaseId);
    return {
      capId,
      kind: "release",
      workId: r.id,
      title: r.title,
      state: r.state.type,
      discCount: r.tracks.length > 0 ? 1 : 0,
      trackCount: r.tracks.length,
    };
  }

  // A real object, but not a work admin cap — "no such work", not an error.
  return null;
}

// ── Balance ──────────────────────────────────────────────────────────────────

/**
 * A wallet's spendable balance in one currency. `core.getBalance` totals coin
 * OBJECTS and the address balance, so funds that arrived either way are counted —
 * which matters because `balance::send_funds` (how the app transfers dollars)
 * credits the address balance, not a coin.
 */
export async function getBalance(client: MisoClient, address: string, coinType?: string): Promise<Balance> {
  const type = coinType ?? client.config.money.usdCoinType;
  const res = await client.protocol.core.getBalance({ owner: address, coinType: type });
  return {
    address: normalizeSuiAddress(address),
    coinType: type,
    balance: u64(res.balance.balance),
    decimals: type === client.config.money.usdCoinType ? client.config.money.usdDecimals : 9,
  };
}

// ── Ownership ────────────────────────────────────────────────────────────────

function isAddressOwner(owner: unknown, address: string): boolean {
  const o = owner as { $kind?: string; AddressOwner?: string } | undefined;
  return (
    o?.$kind === "AddressOwner" && !!o.AddressOwner && normalizeSuiAddress(o.AddressOwner) === normalizeSuiAddress(address)
  );
}

/**
 * Whether `address` controls a party — i.e. holds its `PartyAdminCap`. The cap is
 * a DERIVED object of the party, so this is one `getObject` on a computed id, no
 * search. The chain enforces writes regardless; this drives the UI and hands back
 * the cap id that owner-gated writes need.
 *
 * A failed read means "can't confirm", which resolves to `false` — the editor
 * stays hidden rather than being offered and then rejected on submit.
 */
export async function ownsParty(client: MisoClient, address: string, partyId: string): Promise<Ownership> {
  const capId = client.sui.miso.party.derivePartyAdminCapId(partyId);
  const isOwner = await client.protocol.core
    .getObject({ objectId: capId })
    .then(({ object }) => isAddressOwner(object?.owner, address))
    .catch(() => false);
  return { address: normalizeSuiAddress(address), objectId: partyId, isOwner, capId };
}

/**
 * Whether `address` owns a record. Records are address-owned objects, so this is
 * one `getObject` and an owner compare. Presentation gating only — it decides
 * whether the Snapshots tab appears, and a non-owner has no snapshot content to
 * fetch regardless.
 */
export async function ownsRecord(client: MisoClient, address: string, recordId: string): Promise<Ownership> {
  const isOwner = await client.protocol.core
    .getObject({ objectId: recordId })
    .then(({ object }) => isAddressOwner(object?.owner, address))
    .catch(() => false);
  return { address: normalizeSuiAddress(address), objectId: recordId, isOwner };
}
