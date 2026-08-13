// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Composed catalog reads.
//
// `@misonetwork/sdk` exposes one-question reads: fetch an object by id, list the
// caps an address owns, resolve a share type to its work. Stitching several of
// those together to answer a PRODUCT question — "show me everything this artist
// administers" — is orchestration, and it lives here for the same reason the
// opinionated publish flows do: it picks a traversal strategy, decides how much
// to fetch, and chooses a concurrency/rate-limit tradeoff. Those are platform
// calls, not protocol facts.

import type { ClientWithCoreApi } from "@mysten/sui/client";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import {
  getOwnedRecordingAdminCaps,
  getRecordingByShareType,
  type Recording,
} from "@misonetwork/sdk";

export interface GetAdministeredRecordingsOptions {
  /**
   * Maximum lookups in flight at once. The traversal is one lookup per admin
   * cap, so an artist with a large catalog would otherwise open as many
   * concurrent requests as they have recordings. Defaults to 10.
   */
  concurrency?: number;
}

/**
 * Every `Recording` administered by `owner`.
 *
 * Two stages: list the owner's `RecordingAdminCap`s over the Core API, then
 * resolve each cap's share type back to its recording.
 *
 * The second stage needs GraphQL and is inherently one lookup per cap, because
 * `RecordingAdminCap` carries no back-pointer to its recording — unlike
 * `ReleaseAdminCap`, which stores `release_id` and can therefore be resolved
 * entirely over the Core API. The caps are derived objects (recording → cap via
 * `deriveObjectID`), and that derivation cannot be inverted, so the share type
 * is the only link back. Adding a `recording_id: ID` field to
 * `RecordingAdminCap` on the protocol side would make this a pure Core-API
 * batch read and remove both the GraphQL dependency and the fan-out.
 *
 * Until then the lookups run concurrently in bounded batches rather than
 * serially.
 */
export async function getAdministeredRecordings(
  client: ClientWithCoreApi,
  graphqlClient: SuiGraphQLClient,
  owner: string,
  misoPackageId: string,
  options: GetAdministeredRecordingsOptions = {},
): Promise<Recording[]> {
  const concurrency = Math.max(1, options.concurrency ?? 10);
  const caps = await getOwnedRecordingAdminCaps(client, owner, misoPackageId);

  const recordings: Recording[] = [];
  for (let i = 0; i < caps.length; i += concurrency) {
    const batch = caps.slice(i, i + concurrency);
    const settled = await Promise.all(
      batch.map(async (cap) => {
        try {
          return await getRecordingByShareType(client, graphqlClient, cap.shareType, misoPackageId);
        } catch {
          // A cap whose recording cannot be resolved is skipped rather than
          // failing the whole catalog — matching the previous behavior, where a
          // missing address was silently passed over.
          return null;
        }
      }),
    );
    for (const rec of settled) if (rec) recordings.push(rec);
  }
  return recordings;
}
