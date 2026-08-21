// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { Transaction } from "@mysten/sui/transactions";
import {
  deriveGenreId,
  setReleaseDescription,
  setReleaseDspLinks,
  setReleaseGenres,
  setReleaseKind,
  setReleaseSnapshotBundle,
} from "../src/release-extensions.ts";
import { setReleaseTrackCover } from "../src/cover.ts";

const PKG = "0x" + "cd".repeat(32);
const A = "0x" + "ab".repeat(32);
const B = "0x" + "bc".repeat(32);
const C = "0x" + "de".repeat(32);

interface Call {
  package?: string;
  module: string;
  function: string;
}

function calls(tx: Transaction): Call[] {
  const data = tx.getData() as {
    commands: { $kind: string; MoveCall?: Call }[];
  };
  return data.commands
    .filter((command) => command.$kind === "MoveCall" && command.MoveCall)
    .map((command) => command.MoveCall!);
}

test("release metadata builders cover every attach-at-publish extension", () => {
  const tx = new Transaction();
  setReleaseKind({
    releaseId: A,
    releaseAdminCapId: A,
    kind: "EP",
    releaseKindPackageId: PKG,
  })(tx);
  setReleaseDescription({
    releaseId: A,
    releaseAdminCapId: A,
    description: "A release.",
    releaseDescriptionPackageId: PKG,
  })(tx);
  setReleaseGenres({
    releaseId: A,
    releaseAdminCapId: A,
    primaryGenreId: A,
    secondaryGenreIds: [B],
    trackPrimaryGenres: [{ trackIndex: 0, genreId: C }],
    releaseGenrePackageId: PKG,
  })(tx);
  setReleaseDspLinks({
    releaseId: A,
    releaseAdminCapId: A,
    releaseLinks: [{ platform: "Spotify", id: "123" }],
    trackLinks: [
      {
        trackIndex: 0,
        link: {
          platform: "AppleMusic",
          storefront: "us",
          albumId: "1",
          trackId: "2",
        },
      },
    ],
    releaseDspLinkPackageId: PKG,
  })(tx);
  setReleaseSnapshotBundle({
    releaseId: A,
    releaseAdminCapId: A,
    blobId: 1n,
    releaseSnapshotBundlePackageId: PKG,
    oriPackageId: PKG,
  })(tx);
  setReleaseTrackCover({
    releaseId: A,
    releaseAdminCapId: A,
    trackIndex: 0,
    stillBlobId: 2n,
    coverArtPackageId: PKG,
    releaseCoverArtPackageId: PKG,
    oriPackageId: PKG,
  })(tx);

  const labels = calls(tx).map((call) => `${call.module}::${call.function}`);
  expect(labels).toContain("release_kind::set_kind");
  expect(labels).toContain("release_description::set_description");
  expect(labels).toContain("release_genre::set_primary_genre");
  expect(labels).toContain("release_genre::add_secondary_genre");
  expect(labels).toContain("release_genre::set_track_primary_genre");
  expect(labels).toContain("release_dsp_link::set_release_link");
  expect(labels).toContain("release_dsp_link::set_track_link");
  expect(labels).toContain("release_snapshot_bundle::set_snapshot_bundle");
  expect(labels).toContain("release_cover_art::set_track_cover");
  expect(
    calls(tx)
      .filter((call) =>
        [
          "release_kind",
          "release_description",
          "release_genre",
          "release_dsp_link",
          "release_snapshot_bundle",
          "release_cover_art",
          "cover_art",
          "walrus_data",
        ].includes(call.module),
      )
      .every((call) => call.package === PKG),
  ).toBe(true);
});

test("release kind and description mirror Move byte limits", () => {
  expect(() =>
    setReleaseKind({
      releaseId: A,
      releaseAdminCapId: A,
      kind: "",
      releaseKindPackageId: PKG,
    }),
  ).toThrow(/must not be empty/);
  expect(() =>
    setReleaseKind({
      releaseId: A,
      releaseAdminCapId: A,
      kind: "あ".repeat(11),
      releaseKindPackageId: PKG,
    }),
  ).toThrow(/32 UTF-8 bytes/);
  expect(() =>
    setReleaseDescription({
      releaseId: A,
      releaseAdminCapId: A,
      description: "x".repeat(8193),
      releaseDescriptionPackageId: PKG,
    }),
  ).toThrow(/8192 UTF-8 bytes/);
});

test("genre ids are deterministic and canonical names fail closed", () => {
  expect(deriveGenreId(A, PKG, "ELECTRONIC")).toMatch(/^0x[0-9a-f]{64}$/);
  expect(deriveGenreId(A, PKG, "ELECTRONIC")).toBe(
    deriveGenreId(A, PKG, "ELECTRONIC"),
  );
  expect(() => deriveGenreId(A, PKG, "Electronic")).toThrow(
    /uppercase A-Z and underscores/,
  );
});
