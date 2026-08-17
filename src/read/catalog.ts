// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Catalog reads: pressings, releases, covers, credits, tracklists, and the
// Discover shelf. Everything here is PUBLIC — no address is involved and no two
// callers get different answers, which is what makes this layer edge-cacheable.
//
// The composition of these reads is the point. A pressing page used to cost the
// browser five sequential round-trips to the chain (drop → release → cover →
// credits → recordings); the same work happens once here, inside one datacenter,
// and every subsequent visitor is served from cache.

import { getDrop, getCurrentDrop, type DropView } from "../drop.ts";
import { getReleaseCover, type ReleaseCoverView, type CoverImageRef } from "../cover.ts";
import { getReleaseCredits, getRecordingCredits, type CreditView } from "../credits.ts";
import { getReleaseById, isNotFound } from "@misonetwork/sdk";
import type { Release } from "@misonetwork/sdk";
import type { MisoClient } from "./client.ts";
import { getRecordingTitles } from "./works.ts";
import { gte, int, ms, msOrNull, u64, u64OrNull } from "./internal/scalars.ts";
import { quiltPatchId, u256ToB64Url } from "./internal/walrus.ts";
import type {
  Cover,
  CoverImage,
  Credit,
  Currency,
  DiscoverItem,
  DropPreview,
  PressingDetail,
  PressingView,
  Price,
  RecordAlbum,
  ReleaseDetail,
  TrackCredits,
  TrackView,
  WorkState,
} from "./types.ts";

// ── Walrus URLs ──────────────────────────────────────────────────────────────

/** Aggregator URL for a cover image ref, whichever Walrus variant it is. */
function imageUrl(aggregator: string, ref: CoverImageRef): string {
  const base = aggregator.replace(/\/$/, "");
  if (ref.kind === "blob") return `${base}/v1/blobs/${u256ToB64Url(ref.blobId)}`;
  const patch = quiltPatchId(ref.quiltId, ref.version, ref.startIndex, ref.endIndex);
  return `${base}/v1/blobs/by-quilt-patch-id/${patch}`;
}

function toCover(aggregator: string, view: ReleaseCoverView | null): Cover | null {
  if (!view) return null;
  const image = (ref: CoverImageRef): CoverImage => ({ kind: ref.kind, url: imageUrl(aggregator, ref) });
  return { still: image(view.still), animated: view.animated ? image(view.animated) : null };
}

// ── Currency ─────────────────────────────────────────────────────────────────

/**
 * Symbol + decimals for a coin type. FakeUsd (the testnet dollar) is 6dp; SUI is
 * 9dp; anything else falls back to its module name at 9dp, which is the Sui
 * default and the honest guess for a coin we have no table entry for.
 */
export function currencyInfo(type: string | null): Currency {
  if (!type) return { type: null, symbol: "COIN", decimals: 9 };
  if (/::fakeusd::/i.test(type)) return { type, symbol: "FAKEUSD", decimals: 6 };
  if (type === "0x2::sui::SUI") return { type, symbol: "SUI", decimals: 9 };
  return { type, symbol: (type.split("::").pop() ?? "COIN").toUpperCase(), decimals: 9 };
}

// ── Projections ──────────────────────────────────────────────────────────────

function toPressingView(drop: DropView): PressingView {
  const quantitySold = u64(drop.quantitySold);
  const maxSupply = u64OrNull(drop.maxSupply);
  const price: Price = { kind: drop.price.kind, amount: u64(drop.price.amount) };
  return {
    id: drop.id,
    releaseId: drop.releaseId,
    edition: int(drop.edition),
    price,
    currency: currencyInfo(drop.currencyType),
    quantitySold,
    maxSupply,
    startTimestampMs: ms(drop.startTimestampMs),
    endTimestampMs: msOrNull(drop.endTimestampMs),
    soldOut: maxSupply !== null && gte(quantitySold, maxSupply),
  };
}

function toWorkState(state: Release["state"]): WorkState {
  return state.type === "Published" ? { type: "Published", timestampMs: state.timestampMs } : { type: "Initialized" };
}

function toCredits(credits: CreditView[] | null): Credit[] {
  return (credits ?? []).map((c) => ({ partyId: c.partyId, displayName: c.displayName, roles: [...c.roles] }));
}

/** The release's PRIMARY credits, in chain order — a release's artist line. */
export function primaryArtistNames(credits: Credit[]): string[] {
  return credits.filter((c) => c.roles.includes("Primary")).map((c) => c.displayName);
}

/**
 * Number the protocol's flat tracklist. Display grouping such as discs belongs
 * to metadata extensions and can be layered onto this projection later.
 */
function toTracks(release: Release, titles: Record<string, string>): TrackView[] {
  return release.tracks.map((track, index) => ({
      no: `${index + 1}`,
      title: titles[track.recordingId] ?? "Untitled",
      recordingId: track.recordingId,
      splitBps: int(track.splitBps.value),
      disc: 1,
  }));
}

// ── Cover ────────────────────────────────────────────────────────────────────

/**
 * A release's cover, trying the current `release_cover_art` package and then each
 * legacy one in turn.
 *
 * Covers set before the cover_art package split live under a different
 * `CoverArtKey` TYPE (different package address), so a current-package read
 * simply misses them rather than failing. Ported verbatim from miso-app's
 * `lib/pressing.ts:readReleaseCover`.
 */
export async function readReleaseCover(client: MisoClient, releaseId: string): Promise<Cover | null> {
  const { releaseCoverArt, legacyReleaseCoverArt } = client.config.protocol;
  for (const pkg of [releaseCoverArt, ...legacyReleaseCoverArt]) {
    const cover = await getReleaseCover(client.protocol, releaseId, pkg).catch(() => null);
    if (cover) return toCover(client.config.walrusAggregatorUrl, cover);
  }
  return null;
}

// ── Release ──────────────────────────────────────────────────────────────────

/**
 * A release with its cover, credits, and resolved tracklist.
 *
 * Identity (the release object) is HARD — a failure here is a failed read.
 * Decoration (cover, credits) is SOFT: a release with no cover extension set is a
 * normal state, not a broken page, so those reads swallow their errors. That
 * split is inherited from `lib/drops.ts` and is what keeps a half-configured
 * release renderable.
 */
export async function getReleaseDetail(client: MisoClient, releaseId: string): Promise<ReleaseDetail> {
  const { releaseCredits } = client.config.protocol;

  const [release, cover, credits] = await Promise.all([
    getReleaseById(client.protocol, releaseId),
    readReleaseCover(client, releaseId),
    getReleaseCredits(client.protocol, releaseId, releaseCredits).catch(() => null),
  ]);

  const recordingIds = release.tracks.map((track) => track.recordingId);
  const titles = await getRecordingTitles(client.protocol, client.graphql, recordingIds, client.config.protocol.miso);

  const creditViews = toCredits(credits);
  return {
    id: release.id,
    title: release.title,
    subtitle: null,
    state: toWorkState(release.state),
    publishedAtMs: release.state.type === "Published" ? release.state.timestampMs : null,
    cover,
    credits: creditViews,
    primaryArtists: primaryArtistNames(creditViews),
    discCount: release.tracks.length > 0 ? 1 : 0,
    tracks: toTracks(release, titles),
  };
}

/**
 * Per-track credits for a release, keyed by recording id. A track with no credits
 * set maps to an empty entry rather than being absent, so a caller can tell
 * "nothing credited" from "no such track".
 */
export async function getTrackCredits(client: MisoClient, releaseId: string): Promise<Record<string, TrackCredits>> {
  const { recordingCredits } = client.config.protocol;
  const release = await getReleaseById(client.protocol, releaseId);
  const recordingIds = release.tracks.map((track) => track.recordingId);

  const entries = await Promise.all(
    recordingIds.map(async (id) => {
      const view = await getRecordingCredits(client.protocol, id, recordingCredits).catch(() => null);
      const credits: TrackCredits = {
        credits: toCredits(view?.credits ?? null),
        primaryArtistIds: view?.primaryArtistIds ?? [],
        featuredArtistIds: view?.featuredArtistIds ?? [],
      };
      return [id, credits] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// ── Pressing ─────────────────────────────────────────────────────────────────

/** Everything the pressing buy page renders. `null` when no such pressing exists. */
export async function getPressingDetail(client: MisoClient, pressingId: string): Promise<PressingDetail | null> {
  const pressing = await getDrop(client.protocol, pressingId);
  if (!pressing) return null;
  const release = await getReleaseDetail(client, pressing.releaseId);
  return { pressing: toPressingView(pressing), release };
}

/**
 * The confirmation preview behind "paste a pressing id to pin it". Verifies the
 * object really is a `Drop` before spending reads on it — a release id or a
 * record id pasted by mistake must come back as `null`, not as a half-built card.
 */
export async function getDropPreview(client: MisoClient, dropId: string): Promise<DropPreview | null> {
  const { object } = await client.protocol.core.getObject({ objectId: dropId, include: { content: true } }).catch(() => ({ object: null }));
  if (!object || !/::drop::Drop</.test(object.type ?? "")) return null;

  const pressing = await getDrop(client.protocol, dropId);
  if (!pressing?.currencyType) return null;

  const [release, cover] = await Promise.all([
    getReleaseById(client.protocol, pressing.releaseId),
    readReleaseCover(client, pressing.releaseId),
  ]);

  return {
    pressingId: dropId,
    currency: currencyInfo(pressing.currencyType),
    title: release.title,
    subtitle: null,
    coverUrl: cover?.still.url ?? null,
    price: { kind: pressing.price.kind, amount: u64(pressing.price.amount) },
    trackCount: release.tracks.length,
  };
}

// ── Discover ─────────────────────────────────────────────────────────────────

/**
 * The records currently on sale.
 *
 * Configured by RELEASE id, never by drop id: a release id is permanent, while a
 * drop is superseded (and the old `Drop` destroyed) whenever a new edition opens.
 * Following the release's `CurrentDropKey` pointer keeps this list pointing at the
 * live edition without anyone touching the config.
 */
export async function getDiscoverShelf(client: MisoClient): Promise<DiscoverItem[]> {
  const items = await Promise.all(client.config.discoverReleaseIds.map((id) => resolveDiscoverItem(client, id)));
  return items.filter((d): d is DiscoverItem => d !== null);
}

async function resolveDiscoverItem(client: MisoClient, releaseId: string): Promise<DiscoverItem | null> {
  const drop = await getCurrentDrop(client.protocol, {
    releaseId,
    misoDropPackageId: client.config.protocol.drop,
  });
  if (!drop) return null;

  const [release, cover, credits] = await Promise.all([
    getReleaseById(client.protocol, releaseId),
    readReleaseCover(client, releaseId),
    getReleaseCredits(client.protocol, releaseId, client.config.protocol.releaseCredits).catch(() => null),
  ]);

  return {
    pressing: toPressingView(drop),
    releaseId,
    title: release.title,
    artist: primaryArtistNames(toCredits(credits)).join(", "),
    coverUrl: cover?.still.url ?? null,
  };
}

// ── Record → release ─────────────────────────────────────────────────────────

/**
 * A record's parent release. Both live `Record` struct layouts expose it — card
 * checkout's `{ release_id, number }` and the SDK view's
 * `{ release_id, edition, variant }` — so we probe both spellings.
 *
 * This answer is IMMUTABLE for the life of the record, which is what lets the
 * endpoint in front of it cache for a year.
 */
export async function getRecordAlbum(client: MisoClient, recordId: string): Promise<RecordAlbum | null> {
  try {
    const { object } = await client.protocol.core.getObject({ objectId: recordId, include: { json: true } });
    const json = (object?.json ?? {}) as Record<string, unknown>;
    const raw = json.release_id ?? json.releaseId;
    return { recordId, releaseId: typeof raw === "string" && raw ? raw : null };
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}
