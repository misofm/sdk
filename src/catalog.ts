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
  getCompositionAddressByShareType,
  getOwnedRecordingAdminCaps,
  getRecordingByShareType,
  getRecordingShareTypes,
  getReleaseById,
  type Recording,
} from "@misonetwork/sdk";
import {
  getCompositionCredits,
  getRecordingCredits,
  type CreditView,
  type RecordingCreditsView,
} from "./credits.ts";

export interface GetReleaseTrackCreditsOptions {
  /** Core Miso package that defines Composition and Recording. */
  misoPackageId: string;
  /** Package that defines the composition_credits extension key. */
  compositionCreditsPackageId: string;
  /** Package that defines the recording_credits extension key. */
  recordingCreditsPackageId: string;
}

export interface ReleaseTrackCredits {
  compositionCredits: CreditView[];
  recordingCredits: RecordingCreditsView;
}

const EMPTY_RECORDING_CREDITS: RecordingCreditsView = {
  credits: [],
  primaryArtistIds: [],
  featuredArtistIds: [],
};

/**
 * Composition and recording credits for every track on a release, keyed by
 * recording id.
 *
 * The read follows the chain's actual object graph instead of release credits:
 * Release -> Recording -> Composition. Recording credit fields and recording
 * type parameters are fetched together for every track. Composition addresses
 * are then resolved concurrently, deduplicated, and all composition credit
 * fields are fetched concurrently as well.
 */
export async function getReleaseTrackCredits(
  client: ClientWithCoreApi,
  graphqlClient: SuiGraphQLClient,
  releaseId: string,
  options: GetReleaseTrackCreditsOptions,
): Promise<Record<string, ReleaseTrackCredits>> {
  const release = await getReleaseById(client, releaseId);
  return getTrackCreditsByRecordingIds(
    client,
    graphqlClient,
    release.tracks.map((track) => track.recordingId),
    options,
  );
}

/**
 * Composition and recording credits for the supplied recordings, keyed by
 * recording id. This form is intended for consumers that already loaded a
 * release and do not need to fetch it again.
 */
export async function getTrackCreditsByRecordingIds(
  client: ClientWithCoreApi,
  graphqlClient: SuiGraphQLClient,
  recordingIdsInput: readonly string[],
  options: GetReleaseTrackCreditsOptions,
): Promise<Record<string, ReleaseTrackCredits>> {
  const recordingIds = [...new Set(recordingIdsInput)];

  const recordingReads = await Promise.all(
    recordingIds.map(async (recordingId) => {
      const [recordingCredits, [, compositionShareType]] = await Promise.all([
        getRecordingCredits(client, recordingId, options.recordingCreditsPackageId),
        getRecordingShareTypes(client, recordingId),
      ]);
      return { recordingId, recordingCredits, compositionShareType };
    }),
  );

  const compositionShareTypes = [...new Set(recordingReads.map((read) => read.compositionShareType))];
  const compositionAddressEntries = await Promise.all(
    compositionShareTypes.map(async (shareType) => {
      const compositionId = await getCompositionAddressByShareType(
        graphqlClient,
        shareType,
        options.misoPackageId,
      );
      if (!compositionId) throw new Error(`Composition not found for share type: ${shareType}`);
      return [shareType, compositionId] as const;
    }),
  );
  const compositionAddressByShareType = new Map(compositionAddressEntries);

  const compositionIds = [...new Set(compositionAddressEntries.map(([, compositionId]) => compositionId))];
  const compositionCreditEntries = await Promise.all(
    compositionIds.map(async (compositionId) => {
      const credits = await getCompositionCredits(
        client,
        compositionId,
        options.compositionCreditsPackageId,
      );
      return [compositionId, credits ?? []] as const;
    }),
  );
  const compositionCreditsById = new Map(compositionCreditEntries);

  return Object.fromEntries(
    recordingReads.map((read) => {
      const compositionId = compositionAddressByShareType.get(read.compositionShareType)!;
      return [
        read.recordingId,
        {
          compositionCredits: compositionCreditsById.get(compositionId) ?? [],
          recordingCredits: read.recordingCredits ?? EMPTY_RECORDING_CREDITS,
        },
      ];
    }),
  );
}

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
