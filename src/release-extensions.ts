// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// First-party metadata attached to a protocol Release. The JSON/CLI release
// intent aggregates these concerns, but every value is written by its own
// independently deployed extension package.

import { deriveDynamicFieldID } from "@mysten/sui/utils";
import type {
  Transaction,
  TransactionArgument,
} from "@mysten/sui/transactions";
import type { TxThunk } from "./transactions.ts";
import * as genre from "./contracts/genre/genre.ts";
import * as releaseDescription from "./contracts/release_description/release_description.ts";
import * as releaseDspLink from "./contracts/release_dsp_link/release_dsp_link.ts";
import * as releaseGenre from "./contracts/release_genre/release_genre.ts";
import * as releaseKind from "./contracts/release_kind/release_kind.ts";
import * as releaseSnapshotBundle from "./contracts/release_snapshot_bundle/release_snapshot_bundle.ts";
import { asU64, directAdminCap, invokeWithAdminCap, type AdminCapAuthority, type U64Input } from "./vault.ts";

type ReleaseAuthorityInput =
  | { readonly authority: AdminCapAuthority; readonly releaseAdminCapId?: never }
  | { readonly authority?: never; readonly releaseAdminCapId: string };
interface ReleaseExtensionTargetBase {
  releaseId: string;
}
export type ReleaseExtensionTarget = ReleaseExtensionTargetBase & ReleaseAuthorityInput;
function authority(p: ReleaseExtensionTarget): AdminCapAuthority {
  if (p.authority !== undefined) return p.authority;
  if (p.releaseAdminCapId !== undefined) return directAdminCap(p.releaseAdminCapId);
  throw new Error("release authority is required");
}

export type SetReleaseKindParams = ReleaseExtensionTarget & {
  kind: string;
  releaseKindPackageId: string;
};

/** Attach the release's self-declared kind (for example "EP" or "Mixtape"). */
export function setReleaseKind(p: SetReleaseKindParams): TxThunk {
  const bytes = new TextEncoder().encode(p.kind).length;
  if (bytes === 0) throw new Error("setReleaseKind: kind must not be empty");
  if (bytes > 32) {
    throw new Error(
      `setReleaseKind: kind must be at most 32 UTF-8 bytes (got ${bytes})`,
    );
  }
  return (tx) => {
    invokeWithAdminCap(tx, authority(p), {
      target: `${p.releaseKindPackageId}::release_kind::set_kind`,
      arguments: [tx.object(p.releaseId), tx.pure.string(p.kind)],
      adminCapIndex: 1,
    });
  };
}

export type SetReleaseDescriptionParams = ReleaseExtensionTarget & {
  description: string;
  releaseDescriptionPackageId: string;
};

/** Attach the release's editorial description. */
export function setReleaseDescription(p: SetReleaseDescriptionParams): TxThunk {
  const bytes = new TextEncoder().encode(p.description).length;
  if (bytes === 0) {
    throw new Error("setReleaseDescription: description must not be empty");
  }
  if (bytes > 8192) {
    throw new Error(
      `setReleaseDescription: description must be at most 8192 UTF-8 bytes (got ${bytes})`,
    );
  }
  return (tx) => {
    invokeWithAdminCap(tx, authority(p), {
      target: `${p.releaseDescriptionPackageId}::release_description::set_description`,
      arguments: [tx.object(p.releaseId), tx.pure.string(p.description)],
      adminCapIndex: 1,
    });
  };
}

const GENRE_NAME_RE = /^[A-Z]+(?:_[A-Z]+)*$/;

/** Validate the canonical on-chain genre vocabulary spelling. */
export function assertCanonicalGenreName(name: string): void {
  const bytes = new TextEncoder().encode(name).length;
  if (bytes === 0 || bytes > 64 || !GENRE_NAME_RE.test(name)) {
    throw new Error(
      `Genre name must be 1-64 bytes of uppercase A-Z and underscores; got ${JSON.stringify(name)}`,
    );
  }
}

/** Derive the immutable Genre object id for a canonical vocabulary name. */
export function deriveGenreId(
  genreRegistryId: string,
  genrePackageId: string,
  canonicalName: string,
): string {
  assertCanonicalGenreName(canonicalName);
  return deriveDynamicFieldID(
    genreRegistryId,
    `${genrePackageId}::genre::GenreKey`,
    genre.GenreKey.serialize([canonicalName]).toBytes(),
  );
}

export interface TrackGenreAssignment {
  trackIndex: U64Input;
  genreId: string;
}

export type SetReleaseGenresParams = ReleaseExtensionTarget & {
  primaryGenreId: string;
  secondaryGenreIds?: readonly string[];
  trackPrimaryGenres?: readonly TrackGenreAssignment[];
  releaseGenrePackageId: string;
};

/** Attach primary/secondary release genres and optional per-track overrides. */
export function setReleaseGenres(p: SetReleaseGenresParams): TxThunk {
  return (tx) => {
    invokeWithAdminCap(tx, authority(p), {
      target: `${p.releaseGenrePackageId}::release_genre::set_primary_genre`,
      arguments: [tx.object(p.releaseId), tx.object(p.primaryGenreId)],
      adminCapIndex: 1,
    });
    for (const genreId of p.secondaryGenreIds ?? []) {
      invokeWithAdminCap(tx, authority(p), {
        target: `${p.releaseGenrePackageId}::release_genre::add_secondary_genre`,
        arguments: [tx.object(p.releaseId), tx.object(genreId)],
        adminCapIndex: 1,
      });
    }
    for (const assignment of p.trackPrimaryGenres ?? []) {
      invokeWithAdminCap(tx, authority(p), {
        target: `${p.releaseGenrePackageId}::release_genre::set_track_primary_genre`,
        arguments: [
          tx.object(p.releaseId),
          tx.pure.u64(asU64("trackIndex", assignment.trackIndex)),
          tx.object(assignment.genreId),
        ],
        adminCapIndex: 1,
      });
    }
  };
}

export type DspLink =
  | { platform: "Spotify"; id: string }
  | {
      platform: "AppleMusic";
      storefront: string;
      albumId: string;
      trackId?: string;
    }
  | { platform: "AmazonMusic"; albumId: string; trackId?: string }
  | { platform: "Bandcamp"; subdomain: string; slug: string }
  | { platform: "Deezer"; id: string }
  | { platform: "SoundCloud"; user: string; slug: string }
  | { platform: "Tidal"; id: string }
  | { platform: "YouTubeMusic"; id: string };

function buildDspLink(
  tx: Transaction,
  packageId: string,
  link: DspLink,
): TransactionArgument {
  switch (link.platform) {
    case "Spotify":
      return tx.add(
        releaseDspLink.newSpotify({ package: packageId, arguments: [link.id] }),
      );
    case "AppleMusic":
      return tx.add(
        link.trackId === undefined
          ? releaseDspLink.newAppleMusicAlbum({
              package: packageId,
              arguments: [link.storefront, link.albumId],
            })
          : releaseDspLink.newAppleMusicTrack({
              package: packageId,
              arguments: [link.storefront, link.albumId, link.trackId],
            }),
      );
    case "AmazonMusic":
      return tx.add(
        link.trackId === undefined
          ? releaseDspLink.newAmazonMusicAlbum({
              package: packageId,
              arguments: [link.albumId],
            })
          : releaseDspLink.newAmazonMusicTrack({
              package: packageId,
              arguments: [link.albumId, link.trackId],
            }),
      );
    case "Bandcamp":
      return tx.add(
        releaseDspLink.newBandcamp({
          package: packageId,
          arguments: [link.subdomain, link.slug],
        }),
      );
    case "Deezer":
      return tx.add(
        releaseDspLink.newDeezer({ package: packageId, arguments: [link.id] }),
      );
    case "SoundCloud":
      return tx.add(
        releaseDspLink.newSoundcloud({
          package: packageId,
          arguments: [link.user, link.slug],
        }),
      );
    case "Tidal":
      return tx.add(
        releaseDspLink.newTidal({ package: packageId, arguments: [link.id] }),
      );
    case "YouTubeMusic":
      return tx.add(
        releaseDspLink.newYoutubeMusic({
          package: packageId,
          arguments: [link.id],
        }),
      );
  }
}

export interface TrackDspLink {
  trackIndex: U64Input;
  link: DspLink;
}

export type SetReleaseDspLinksParams = ReleaseExtensionTarget & {
  releaseLinks?: readonly DspLink[];
  trackLinks?: readonly TrackDspLink[];
  releaseDspLinkPackageId: string;
};

/** Attach release-level and per-track DSP links. */
export function setReleaseDspLinks(p: SetReleaseDspLinksParams): TxThunk {
  return (tx) => {
    for (const link of p.releaseLinks ?? []) {
      const value = buildDspLink(tx, p.releaseDspLinkPackageId, link);
      invokeWithAdminCap(tx, authority(p), {
        target: `${p.releaseDspLinkPackageId}::release_dsp_link::set_release_link`,
        arguments: [tx.object(p.releaseId), value],
        adminCapIndex: 1,
      });
    }
    for (const item of p.trackLinks ?? []) {
      const value = buildDspLink(tx, p.releaseDspLinkPackageId, item.link);
      invokeWithAdminCap(tx, authority(p), {
        target: `${p.releaseDspLinkPackageId}::release_dsp_link::set_track_link`,
        arguments: [tx.object(p.releaseId), tx.pure.u64(asU64("trackIndex", item.trackIndex)), value],
        adminCapIndex: 1,
      });
    }
  };
}

export type SetReleaseSnapshotBundleParams = ReleaseExtensionTarget & {
  /** Plaintext outer Walrus quilt blob id, as the on-chain u256 value. */
  blobId: bigint | string;
  releaseSnapshotBundlePackageId: string;
  oriPackageId: string;
};

/** Attach the write-once release snapshot-bundle pointer. */
export function setReleaseSnapshotBundle(
  p: SetReleaseSnapshotBundleParams,
): TxThunk {
  return (tx) => {
    const bundle = tx.moveCall({
      target: `${p.oriPackageId}::walrus_data::new_blob`,
      arguments: [tx.pure.u256(p.blobId)],
    });
    invokeWithAdminCap(tx, authority(p), {
      target: `${p.releaseSnapshotBundlePackageId}::release_snapshot_bundle::set_snapshot_bundle`,
      arguments: [tx.object(p.releaseId), bundle],
      adminCapIndex: 1,
    });
  };
}
