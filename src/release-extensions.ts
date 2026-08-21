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
import { directAdminCap, type AdminCapAuthority, withAdminCap } from "./vault.ts";

export interface ReleaseExtensionTarget {
  releaseId: string;
  /** Explicit legacy direct cap or Vault authority for this release. */
  authority?: AdminCapAuthority;
  /** @deprecated Pass explicit `authority: directAdminCap(releaseAdminCapId)`. */
  releaseAdminCapId?: string;
}
function authority(p: ReleaseExtensionTarget): AdminCapAuthority {
  return p.authority ?? directAdminCap(p.releaseAdminCapId!);
}

export interface SetReleaseKindParams extends ReleaseExtensionTarget {
  kind: string;
  releaseKindPackageId: string;
}

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
    withAdminCap(tx, authority(p), (adminCap) => tx.add(
      releaseKind.setKind({
        package: p.releaseKindPackageId,
        arguments: [p.releaseId, adminCap, p.kind],
      }),
    ));
  };
}

export interface SetReleaseDescriptionParams extends ReleaseExtensionTarget {
  description: string;
  releaseDescriptionPackageId: string;
}

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
    withAdminCap(tx, authority(p), (adminCap) => tx.add(
      releaseDescription.setDescription({
        package: p.releaseDescriptionPackageId,
        arguments: [p.releaseId, adminCap, p.description],
      }),
    ));
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
  trackIndex: number;
  genreId: string;
}

export interface SetReleaseGenresParams extends ReleaseExtensionTarget {
  primaryGenreId: string;
  secondaryGenreIds?: readonly string[];
  trackPrimaryGenres?: readonly TrackGenreAssignment[];
  releaseGenrePackageId: string;
}

/** Attach primary/secondary release genres and optional per-track overrides. */
export function setReleaseGenres(p: SetReleaseGenresParams): TxThunk {
  return (tx) => withAdminCap(tx, authority(p), (adminCap) => {
    tx.add(
      releaseGenre.setPrimaryGenre({
        package: p.releaseGenrePackageId,
        arguments: [p.releaseId, adminCap, p.primaryGenreId],
      }),
    );
    for (const genreId of p.secondaryGenreIds ?? []) {
      tx.add(
        releaseGenre.addSecondaryGenre({
          package: p.releaseGenrePackageId,
          arguments: [p.releaseId, adminCap, genreId],
        }),
      );
    }
    for (const assignment of p.trackPrimaryGenres ?? []) {
      tx.add(
        releaseGenre.setTrackPrimaryGenre({
          package: p.releaseGenrePackageId,
          arguments: [
            p.releaseId,
            adminCap,
            assignment.trackIndex,
            assignment.genreId,
          ],
        }),
      );
    }
  });
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
  trackIndex: number;
  link: DspLink;
}

export interface SetReleaseDspLinksParams extends ReleaseExtensionTarget {
  releaseLinks?: readonly DspLink[];
  trackLinks?: readonly TrackDspLink[];
  releaseDspLinkPackageId: string;
}

/** Attach release-level and per-track DSP links. */
export function setReleaseDspLinks(p: SetReleaseDspLinksParams): TxThunk {
  return (tx) => withAdminCap(tx, authority(p), (adminCap) => {
    for (const link of p.releaseLinks ?? []) {
      const value = buildDspLink(tx, p.releaseDspLinkPackageId, link);
      tx.add(
        releaseDspLink.setReleaseLink({
          package: p.releaseDspLinkPackageId,
          arguments: [p.releaseId, adminCap, value],
        }),
      );
    }
    for (const item of p.trackLinks ?? []) {
      const value = buildDspLink(tx, p.releaseDspLinkPackageId, item.link);
      tx.add(
        releaseDspLink.setTrackLink({
          package: p.releaseDspLinkPackageId,
          arguments: [p.releaseId, adminCap, item.trackIndex, value],
        }),
      );
    }
  });
}

export interface SetReleaseSnapshotBundleParams extends ReleaseExtensionTarget {
  /** Plaintext outer Walrus quilt blob id, as the on-chain u256 value. */
  blobId: bigint | string;
  releaseSnapshotBundlePackageId: string;
  oriPackageId: string;
}

/** Attach the write-once release snapshot-bundle pointer. */
export function setReleaseSnapshotBundle(
  p: SetReleaseSnapshotBundleParams,
): TxThunk {
  return (tx) => {
    const bundle = tx.moveCall({
      target: `${p.oriPackageId}::walrus_data::new_blob`,
      arguments: [tx.pure.u256(p.blobId)],
    });
    withAdminCap(tx, authority(p), (adminCap) => tx.add(
      releaseSnapshotBundle.setSnapshotBundle({
        package: p.releaseSnapshotBundlePackageId,
        arguments: [p.releaseId, adminCap, bundle],
      }),
    ));
  };
}
