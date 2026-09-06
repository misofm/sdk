// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Genre name resolution. `party.getGenres` returns `Genre` OBJECT IDS; each Genre
// object carries a screaming-snake name ("HIP_HOP"). There is no id→name table
// anywhere off-chain, so the names are read from the objects and humanized.

import type { MisoClient } from "./client.ts";

/** "HIP_HOP" → "Hip Hop". */
function humanize(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Resolve `Genre` object ids to display names. Best-effort: an id that fails to
 * read is dropped rather than failing the artist page around it.
 */
export async function resolveGenreNames(client: MisoClient, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const { objects } = await client.protocol.core.getObjects({ objectIds: ids, include: { json: true } });
    const out: string[] = [];
    for (const o of objects) {
      if (o instanceof Error) continue;
      const name = (o.json as { name?: unknown } | null)?.name;
      if (typeof name === "string" && name) out.push(humanize(name));
    }
    return out;
  } catch {
    return [];
  }
}
