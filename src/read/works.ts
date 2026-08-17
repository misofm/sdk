// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from "@mysten/sui/client";
import type { SuiGraphQLClient } from "@mysten/sui/graphql";
import {
  extractTypeParams2,
  getCompositionsByIds,
  getRecordingsByIds,
  getReleasesByIds,
  type Composition,
  type Recording,
  type Release,
} from "@misonetwork/sdk";

export interface WorkShareTypes {
  compositions: readonly string[];
  recordings: readonly string[];
}

export interface WorkAddressesByShareType {
  compositions: Partial<Record<string, string>>;
  recordings: Partial<Record<string, string>>;
}

interface ObjectsByTypeResult {
  objects: {
    nodes: Array<{
      address: string;
      asMoveObject: { contents: { type: { repr: string } } | null } | null;
    }>;
  } | null;
}

/** Resolve work share types without relying on unpublished protocol helpers. */
export async function getWorkAddressesByShareTypes(
  client: SuiGraphQLClient,
  shareTypes: WorkShareTypes,
  misoPackageId: string,
): Promise<WorkAddressesByShareType> {
  const compositions = [...new Set(shareTypes.compositions)];
  const recordingSet = new Set(shareTypes.recordings);
  const out: WorkAddressesByShareType = { compositions: {}, recordings: {} };

  const compositionEntries = await Promise.all(
    compositions.map(async (shareType) => {
      const type = `${misoPackageId}::composition::Composition<${shareType}>`;
      const result = await client.query<ObjectsByTypeResult, { type: string }>({
        query: `query WorkByType($type: String!) {
          objects(filter: { type: $type }) {
            nodes { address asMoveObject { contents { type { repr } } } }
          }
        }`,
        variables: { type },
      });
      if (result.errors?.length) throw new Error(result.errors[0]!.message);
      return [shareType, result.data?.objects?.nodes[0]?.address] as const;
    }),
  );
  for (const [shareType, address] of compositionEntries) {
    if (address) out.compositions[shareType] = address;
  }

  if (recordingSet.size > 0) {
    const type = `${misoPackageId}::recording::Recording`;
    const result = await client.query<ObjectsByTypeResult, { type: string }>({
      query: `query RecordingsByType($type: String!) {
        objects(filter: { type: $type }) {
          nodes { address asMoveObject { contents { type { repr } } } }
        }
      }`,
      variables: { type },
    });
    if (result.errors?.length) throw new Error(result.errors[0]!.message);
    for (const node of result.data?.objects?.nodes ?? []) {
      const repr = node.asMoveObject?.contents?.type.repr;
      if (!repr) continue;
      let recordingShareType: string | undefined;
      try {
        [recordingShareType] = extractTypeParams2(repr);
      } catch {
        recordingShareType = /<(.+)>$/.exec(repr)?.[1]?.trim();
      }
      if (recordingShareType && recordingSet.has(recordingShareType)) {
        out.recordings[recordingShareType] = node.address;
      }
    }
  }

  return out;
}

export interface WorkIds {
  compositions: readonly string[];
  recordings: readonly string[];
  releases: readonly string[];
}

export interface WorksById {
  compositions: Partial<Record<string, Composition>>;
  recordings: Partial<Record<string, Recording>>;
  releases: Partial<Record<string, Release>>;
}

/** Fetch each work kind through the authoritative protocol SDK. */
export async function getWorksByIds(client: ClientWithCoreApi, ids: WorkIds): Promise<WorksById> {
  const [compositions, recordings, releases] = await Promise.all([
    getCompositionsByIds(client, [...ids.compositions]),
    getRecordingsByIds(client, [...ids.recordings]),
    getReleasesByIds(client, [...ids.releases]),
  ]);
  return { compositions, recordings, releases };
}

/**
 * Resolve display titles for both deployed recording layouts. Older recordings
 * carry `title` in JSON; current recordings inherit it from their composition.
 */
export async function getRecordingTitles(
  client: ClientWithCoreApi,
  graphql: SuiGraphQLClient,
  recordingIds: readonly string[],
  misoPackageId: string,
): Promise<Record<string, string>> {
  const ids = [...new Set(recordingIds)];
  if (ids.length === 0) return {};

  const { objects } = await client.core.getObjects({ objectIds: ids, include: { json: true } });
  const titles: Record<string, string> = {};
  const compositionShareByRecording: Record<string, string> = {};

  for (const object of objects) {
    if (object instanceof Error) continue;
    const json = object.json as { title?: unknown } | null;
    if (typeof json?.title === "string" && json.title) {
      titles[object.objectId] = json.title;
      continue;
    }
    try {
      const [, compositionShareType] = extractTypeParams2(object.type);
      compositionShareByRecording[object.objectId] = compositionShareType;
    } catch {
      // A deployed layout with no composition type and no JSON title remains Untitled.
    }
  }

  const compositionShareTypes = Object.values(compositionShareByRecording);
  if (compositionShareTypes.length === 0) return titles;
  const addresses = await getWorkAddressesByShareTypes(
    graphql,
    { compositions: compositionShareTypes, recordings: [] },
    misoPackageId,
  );
  const compositions = await getCompositionsByIds(
    client,
    Object.values(addresses.compositions).filter((id): id is string => !!id),
  );
  for (const [recordingId, shareType] of Object.entries(compositionShareByRecording)) {
    const compositionId = addresses.compositions[shareType];
    const title = compositionId ? compositions[compositionId]?.title : undefined;
    if (title) titles[recordingId] = title;
  }
  return titles;
}
