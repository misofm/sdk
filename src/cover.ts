// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Release cover art. A cover is a still image (optionally an animation) stored as
// a Walrus blob and referenced on-chain via `ori::WalrusData`. We build the ref
// (`ori::walrus_data::new_blob`, a raw call — ori is an external dep), wrap it in a
// `cover_art::CoverArt`, and attach it to the Release with
// `release_cover_art::set_cover` (gated by the ReleaseAdminCap).
//
// Blob ids are passed as `u256` (decimal string or bigint) — the CLI converts the
// base64url Walrus blob id to u256 before calling.
//
// The `Release` being covered is a protocol object; the cover is a platform
// opinion attached to it through the release's cap-gated `uid_mut` hook, which is
// why this module ships from `@misofm/sdk` rather than the protocol SDK.

import type { ClientWithCoreApi } from "@mysten/sui/client";
import { bcs } from "@mysten/sui/bcs";
import { deriveDynamicFieldID } from "@mysten/sui/utils";
import type { TxThunk } from "./transactions.ts";
import { OPTION_NONE, OPTION_SOME } from "./internal.ts";
import { isNotFound } from "./queries.ts";
import * as coverArt from "./contracts/cover_art/cover_art.ts";
import * as releaseCoverArt from "./contracts/release_cover_art/release_cover_art.ts";

export interface SetReleaseCoverParams {
  /** The `Release` object to attach the cover to. */
  releaseId: string;
  /** The release's `ReleaseAdminCap`. */
  releaseAdminCapId: string;
  /** Walrus blob id of the still cover image, as `u256` (decimal string or bigint). */
  stillBlobId: bigint | string;
  /** Optional animated-cover Walrus blob id (`u256`); omit for a still-only cover. */
  animatedBlobId?: bigint | string | null;
  /** `cover_art` package — home of the `CoverArt` value type (`cover_art::new`). */
  coverArtPackageId: string;
  /** `release_cover_art` package — home of the `set_cover` extension entry point. */
  releaseCoverArtPackageId: string;
  /** `ori` package (home of `walrus_data::new_blob` / the `WalrusData` type). */
  oriPackageId: string;
}

/** Sets (or replaces) a release's album-level cover from Walrus blob ids. */
export function setReleaseCover(p: SetReleaseCoverParams): TxThunk {
  return (tx) => {
    const walrusType = `${p.oriPackageId}::walrus_data::WalrusData`;
    const blob = (id: bigint | string) =>
      tx.moveCall({ target: `${p.oriPackageId}::walrus_data::new_blob`, arguments: [tx.pure.u256(id)] });

    const still = blob(p.stillBlobId);
    const animated =
      p.animatedBlobId == null
        ? tx.moveCall({ target: OPTION_NONE, typeArguments: [walrusType] })
        : tx.moveCall({ target: OPTION_SOME, typeArguments: [walrusType], arguments: [blob(p.animatedBlobId)] });

    const cover = tx.add(coverArt._new({ package: p.coverArtPackageId, arguments: [still, animated] }));
    tx.add(
      releaseCoverArt.setCover({
        package: p.releaseCoverArtPackageId,
        arguments: [p.releaseId, p.releaseAdminCapId, cover],
      }),
    );
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * A normalized reference to a cover image's Walrus data. Blob ids are returned as
 * `u256` decimal strings (the on-chain form); callers convert to a base64url
 * aggregator URL with `@unconfirmed/ori` (`u256ToB64Url` / `walrusDataUrl`).
 */
export type CoverImageRef =
  | { kind: "blob"; blobId: string }
  | { kind: "quiltPatch"; quiltId: string; version: number; startIndex: number; endIndex: number };

/** A release's album-level cover: a still image and an optional animation. */
export interface ReleaseCoverView {
  still: CoverImageRef;
  animated: CoverImageRef | null;
}

// The cover is a dynamic field on the release UID under an empty `ExtensionKey()`
// (Move's implicit `dummy_field: bool` → one `false` byte). The stored value is a
// `Field { id, name: ExtensionKey, value: ReleaseCoverArt }`.
const CoverArtField = bcs.struct("Field", {
  id: bcs.Address,
  name: releaseCoverArt.ExtensionKey,
  value: releaseCoverArt.ReleaseCoverArt,
});
const COVER_ART_KEY_BYTES = releaseCoverArt.ExtensionKey.serialize([false]).toBytes();

/** A parsed `ori::WalrusData` value (a MoveEnum: `Blob` or `QuiltPatch`). */
type ParsedWalrusData =
  | { $kind: "Blob"; Blob: [string | number | bigint, unknown] }
  | { $kind: "QuiltPatch"; QuiltPatch: [string | number | bigint, number, number, number] };

function toCoverImageRef(wd: ParsedWalrusData): CoverImageRef {
  if (wd.$kind === "Blob") return { kind: "blob", blobId: String(wd.Blob[0]) };
  const [quiltId, version, startIndex, endIndex] = wd.QuiltPatch;
  return { kind: "quiltPatch", quiltId: String(quiltId), version, startIndex, endIndex };
}

/**
 * Reads a release's album-level cover (the `release_cover_art` extension), or
 * `null` if no cover is attached. Derives the `ExtensionKey` dynamic field on the
 * release, parses the `ReleaseCoverArt`, and returns the still (+ optional
 * animation) as normalized Walrus refs for the app's featured-pressing card.
 */
export async function getReleaseCover(
  client: ClientWithCoreApi,
  releaseId: string,
  releaseCoverArtPackageId: string,
): Promise<ReleaseCoverView | null> {
  const fieldId = deriveDynamicFieldID(
    releaseId,
    `${releaseCoverArtPackageId}::release_cover_art::ExtensionKey`,
    COVER_ART_KEY_BYTES,
  );

  let content: Uint8Array | null;
  try {
    const { object } = await client.core.getObject({ objectId: fieldId, include: { content: true } });
    content = object?.content ?? null;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
  if (!content) return null;

  const cover = CoverArtField.parse(content).value.cover as
    | { still: ParsedWalrusData; animated: ParsedWalrusData | null }
    | null;
  if (!cover) return null;

  return {
    still: toCoverImageRef(cover.still),
    animated: cover.animated ? toCoverImageRef(cover.animated) : null,
  };
}
