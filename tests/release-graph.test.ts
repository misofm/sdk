// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Structural gate for the single-PTB release publisher: every track is created
// exactly once after the target id is derived, then the registry assembles and
// core publishes the release.

import { test, expect } from "bun:test";
import { Transaction } from "@mysten/sui/transactions";
import { publishReleaseGraph } from "../src/release-graph.ts";

const PKG = "0x" + "cd".repeat(32);
const A = "0x" + "ab".repeat(32);
const share = (n: string) => "0x" + n.repeat(32) + "::share::Share";

function fns(tx: Transaction): string[] {
  const data = tx.getData() as { commands: { $kind: string; MoveCall?: { module: string; function: string } }[] };
  return data.commands.filter((c) => c.$kind === "MoveCall" && c.MoveCall).map((c) => `${c.MoveCall!.module}::${c.MoveCall!.function}`);
}

test("publishReleaseGraph: create → derive → track → registry → publish ordering, one PTB", () => {
  const tx = new Transaction();
  publishReleaseGraph({
    compositions: [
      { shareType: share("11"), shareCurrencyId: A, shareTreasuryCapId: A, title: "A", royaltyRateBps: 1000, shareRecipients: [{ address: A, value: 1 }], adminAddress: A },
      { shareType: share("22"), shareCurrencyId: A, shareTreasuryCapId: A, title: "B", royaltyRateBps: 1000, shareRecipients: [{ address: A, value: 1 }], adminAddress: A },
    ],
    recordings: [
      { shareType: share("33"), shareCurrencyId: A, shareTreasuryCapId: A, compositionShareType: share("11"), parentCompositionIndex: 0, shareRecipients: [{ address: A, value: 1 }], adminAddress: A },
      { shareType: share("44"), shareCurrencyId: A, shareTreasuryCapId: A, compositionShareType: share("22"), parentCompositionIndex: 1, shareRecipients: [{ address: A, value: 1 }], adminAddress: A },
    ],
    release: { title: "EP", nonce: "1", adminAddress: A, releaseRegistryId: A, tracks: [{ recordingIndex: 0, splitBps: 5000 }, { recordingIndex: 1, splitBps: 5000 }] },
    misoPackageId: PKG,
    minatoPackageId: PKG,
  })(tx);

  const seq = fns(tx);
  const first = (name: string) => seq.indexOf(name);
  const last = (name: string) => seq.lastIndexOf(name);
  const count = (name: string) => seq.filter((f) => f === name).length;

  expect(count("composition::new")).toBe(2);
  expect(count("recording::new")).toBe(2);
  expect(count("object::id")).toBe(2);
  expect(count("release::derive_target_release_id")).toBe(1);
  expect(count("track::new")).toBe(2);
  expect(count("release::new")).toBe(1);

  expect(last("composition::new")).toBeLessThan(first("composition::publish"));
  expect(last("recording::new")).toBeLessThan(first("recording::publish"));
  expect(last("object::id")).toBeLessThan(first("release::derive_target_release_id"));
  expect(first("release::derive_target_release_id")).toBeLessThan(first("track::new"));
  expect(last("track::new")).toBeLessThan(first("release::new"));
  expect(first("release::new")).toBeLessThan(first("release::publish"));
});

test("publishReleaseGraph: cap-backed existing recording mixes with fresh", () => {
  const tx = new Transaction();
  publishReleaseGraph({
    compositions: [{ shareType: share("11"), shareCurrencyId: A, shareTreasuryCapId: A, title: "A", royaltyRateBps: 1000, shareRecipients: [{ address: A, value: 1 }], adminAddress: A }],
    recordings: [{ shareType: share("33"), shareCurrencyId: A, shareTreasuryCapId: A, compositionShareType: share("11"), parentCompositionIndex: 0, shareRecipients: [{ address: A, value: 1 }], adminAddress: A }],
    release: {
      title: "MIX", nonce: "1", adminAddress: A, releaseRegistryId: A,
      tracks: [
        { recordingIndex: 0, splitBps: 5000 },
        { recordingId: A, recordingAdminCapId: A, recordingShareType: share("55"), compositionShareType: share("66"), splitBps: 5000 },
      ],
    },
    misoPackageId: PKG, minatoPackageId: PKG,
  })(tx);
  const seq = fns(tx);
  expect(seq.filter((f) => f === "release::derive_target_release_id")).toHaveLength(1);
  expect(seq.filter((f) => f === "track::new")).toHaveLength(2);
});

test("publishReleaseGraph: an all-cap release still derives and creates its track", () => {
  const tx = new Transaction();
  publishReleaseGraph({
    compositions: [], recordings: [],
    release: {
      title: "COMPILATION", nonce: "7", adminAddress: A, releaseRegistryId: A,
      tracks: [{ recordingId: A, recordingAdminCapId: A, recordingShareType: share("55"), compositionShareType: share("66"), splitBps: 10000 }],
    },
    misoPackageId: PKG, minatoPackageId: PKG,
  })(tx);
  const seq = fns(tx);
  expect(seq.filter((f) => f === "release::derive_target_release_id")).toHaveLength(1);
  expect(seq.filter((f) => f === "track::new")).toHaveLength(1);
  expect(seq.filter((f) => f === "release::new")).toHaveLength(1);
});
