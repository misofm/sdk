// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Artist reads: a `Party` plus every extension attached to its UID.
//
// The artist page is the clearest case for this whole layer. Its data lives in
// EIGHT separate dynamic fields, each its own package, each its own read — party,
// profile, ctas, genres, links, roles, tags, featured. miso-app fanned all eight
// out from the browser (`lib/party-queries.ts`, plus a second identical fan-out in
// `PartyEditSheet`). Here they are one call, resolved once, cached once.
//
// `roles` and `tags` are opt-in via `include`: only the owner's edit sheet reads
// them, and leaving them out of the public read keeps the hot path to six.

import { resolveGenreNames } from "./genres.ts";
import { readReleaseCover } from "./catalog.ts";
import { getDrop } from "../drop.ts";
import { getReleaseById } from "@misonetwork/sdk";
import { getReleaseCredits } from "../credits.ts";
import type { MisoClient } from "./client.ts";
import type { ArtistProfile, FeaturedRelease, PartyMember, PartySummary } from "./types.ts";

/** Optional sub-resources — read only when asked for. */
export type ArtistInclude = "roles" | "tags";

export interface GetArtistOptions {
  include?: readonly ArtistInclude[];
}

/** Public avatar URL for a party (served from the API's R2 lane; 404 when unset). */
export function partyAvatarUrl(apiBaseUrl: string, partyId: string): string {
  return `${apiBaseUrl.replace(/\/$/, "")}/media/avatar/${partyId}`;
}

/**
 * An artist page, fully resolved. Throws only if the PARTY itself can't be read —
 * every extension is optional by design (a party with no profile set is a new
 * party, not a broken one), so each decoration read falls back to its empty value.
 */
export async function getArtistProfile(
  client: MisoClient,
  partyId: string,
  options: GetArtistOptions = {},
): Promise<ArtistProfile> {
  const include = new Set(options.include ?? []);
  const { party } = client.sui;

  const [profile, ctas, genreIds, links, roles, tags] = await Promise.all([
    party.getProfile(partyId).catch(() => null),
    party.getCtas(partyId).catch(() => []),
    party.getGenres(partyId).catch(() => [] as string[]),
    party.getLinks(partyId).catch(() => []),
    include.has("roles") ? party.getRoles(partyId).catch(() => [] as string[]) : Promise.resolve(undefined),
    include.has("tags") ? party.getTags(partyId).catch(() => [] as string[]) : Promise.resolve(undefined),
  ]);

  // The party read is the one that may legitimately fail (no such party), so it
  // is awaited on its own rather than being swallowed by the batch above.
  const entity = await party.getPartyById(partyId);

  const [genres, members] = await Promise.all([
    resolveGenreNames(client, genreIds),
    resolveMembers(client, entity.kind === "group" ? (entity.members ?? []) : []),
  ]);

  return {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    createdAtMs: entity.createdAtMs,
    bioShort: profile?.bioShort ?? null,
    bioLong: profile?.bioLong ?? null,
    country: profile?.country ?? null,
    languages: profile?.languages ?? [],
    genres,
    links: links.map((l) => ({ platform: l.platform, value: l.value, url: l.url })),
    ctas: ctas.map((c) => ({ label: c.label, url: c.url })),
    members,
    ...(roles !== undefined ? { roles } : {}),
    ...(tags !== undefined ? { tags } : {}),
    avatarUrl: partyAvatarUrl(client.config.apiBaseUrl, entity.id),
  };
}

/** Group members with names resolved. A member that fails to read is dropped. */
async function resolveMembers(client: MisoClient, memberIds: readonly string[]): Promise<PartyMember[]> {
  if (memberIds.length === 0) return [];
  const parties = await client.sui.party.getPartiesByIds([...memberIds]).catch(() => ({}) as Record<string, undefined>);
  return memberIds.flatMap((id) => {
    const p = parties[id];
    return p ? [{ id, name: p.name }] : [];
  });
}

/** Name + kind for many parties at once. Ids that don't resolve are omitted. */
export async function getPartySummaries(client: MisoClient, ids: readonly string[]): Promise<PartySummary[]> {
  if (ids.length === 0) return [];
  const parties = await client.sui.party.getPartiesByIds([...ids]);
  return ids.flatMap((id) => {
    const p = parties[id];
    return p ? [{ id, name: p.name, kind: p.kind }] : [];
  });
}

/**
 * The party's pinned pressing, resolved through to its release and cover.
 * `null` — a successful empty — when nothing is pinned or the pin is dangling
 * (the pressing it named has since been superseded and destroyed).
 */
export async function getFeaturedRelease(client: MisoClient, partyId: string): Promise<FeaturedRelease | null> {
  const pressingId = await client.sui.party.getFeaturedDrop(partyId);
  if (!pressingId) return null;

  const pressing = await getDrop(client.protocol, pressingId);
  if (!pressing) return null;

  const [release, cover, credits, entity] = await Promise.all([
    getReleaseById(client.protocol, pressing.releaseId),
    readReleaseCover(client, pressing.releaseId),
    getReleaseCredits(client.protocol, pressing.releaseId, client.config.protocol.releaseCredits).catch(() => null),
    client.sui.party.getPartyById(partyId),
  ]);

  // The artist line prefers the release's own PRIMARY credits and falls back to
  // the party whose page this is — a release with no credits set still shows an
  // artist, which is the behavior the featured card has always had.
  const primary = (credits ?? []).filter((c) => c.roles.includes("Primary")).map((c) => c.displayName);

  return {
    pressingId,
    releaseId: pressing.releaseId,
    title: release.title,
    artist: primary.length ? primary.join(", ") : entity.name,
    coverUrl: cover?.still.url ?? null,
  };
}
