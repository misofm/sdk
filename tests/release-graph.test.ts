// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Structural gate for the single-PTB release publisher: assert the load-bearing
// command ordering — create all works, derive the id on-chain, deal/track, then
// publish/share — and that it's genuinely one PTB.

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

test("publishReleaseGraph: create → derive → deal → publish ordering, one PTB", () => {
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

  // counts: 2 comps, 2 recs, 2 deals/tracks, one derive + one release::new
  expect(count("composition::new")).toBe(2);
  expect(count("recording::new")).toBe(2);
  expect(count("deal::new")).toBe(2);
  expect(count("release::derive_release_id")).toBe(1);
  expect(count("release::new")).toBe(1);

  // all works created before any is shared/published
  expect(last("composition::new")).toBeLessThan(first("composition::publish"));
  expect(last("recording::new")).toBeLessThan(first("recording::publish"));
  // recording ids read → derive → deals; deals before the works are shared
  expect(last("recording::id")).toBeLessThan(first("release::derive_release_id"));
  expect(first("release::derive_release_id")).toBeLessThan(first("deal::new"));
  expect(last("deal::new")).toBeLessThan(first("recording::publish"));
  // release created, then published
  expect(first("release::new")).toBeLessThan(first("release::publish"));
});

test("publishReleaseGraph: cap-backed existing recording mixes with fresh (deal created inline)", () => {
  const tx = new Transaction();
  publishReleaseGraph({
    compositions: [
      { shareType: share("11"), shareCurrencyId: A, shareTreasuryCapId: A, title: "A", royaltyRateBps: 1000, shareRecipients: [{ address: A, value: 1 }], adminAddress: A },
    ],
    recordings: [
      { shareType: share("33"), shareCurrencyId: A, shareTreasuryCapId: A, compositionShareType: share("11"), parentCompositionIndex: 0, shareRecipients: [{ address: A, value: 1 }], adminAddress: A },
    ],
    release: {
      title: "MIX",
      nonce: "1",
      adminAddress: A,
      releaseRegistryId: A,
      tracks: [
        { recordingIndex: 0, splitBps: 5000 },
        { recordingId: A, recordingAdminCapId: A, recordingShareType: share("55"), compositionShareType: share("66"), splitBps: 5000 },
      ],
    },
    misoPackageId: PKG,
    minatoPackageId: PKG,
  })(tx);
  const seq = fns(tx);
  // one derive; two deals (one fresh, one cap-backed); the existing recording is NOT created here
  expect(seq.filter((f) => f === "release::derive_release_id").length).toBe(1);
  expect(seq.filter((f) => f === "deal::new").length).toBe(2);
  expect(seq.filter((f) => f === "recording::new").length).toBe(1);
  expect(seq.filter((f) => f === "track::new").length).toBe(2);
});

test("publishReleaseGraph: all-deal release skips derive and deal::new entirely", () => {
  const tx = new Transaction();
  publishReleaseGraph({
    compositions: [],
    recordings: [],
    release: {
      title: "COMPILATION",
      nonce: "7",
      adminAddress: A,
      releaseRegistryId: A,
      tracks: [{ dealId: A, recordingId: A, recordingShareType: share("55"), compositionShareType: share("66"), splitBps: 10000 }],
    },
    misoPackageId: PKG,
    minatoPackageId: PKG,
  })(tx);
  const seq = fns(tx);
  expect(seq.filter((f) => f === "release::derive_release_id").length).toBe(0);
  expect(seq.filter((f) => f === "deal::new").length).toBe(0);
  expect(seq.filter((f) => f === "track::new").length).toBe(1);
  expect(seq.filter((f) => f === "release::new").length).toBe(1);
});

test("publishReleaseGraph: pre-made deals cannot coexist with fresh recordings", () => {
  const tx = new Transaction();
  expect(() =>
    publishReleaseGraph({
      compositions: [
        { shareType: share("11"), shareCurrencyId: A, shareTreasuryCapId: A, title: "A", royaltyRateBps: 1000, shareRecipients: [{ address: A, value: 1 }], adminAddress: A },
      ],
      recordings: [
        { shareType: share("33"), shareCurrencyId: A, shareTreasuryCapId: A, compositionShareType: share("11"), parentCompositionIndex: 0, shareRecipients: [{ address: A, value: 1 }], adminAddress: A },
      ],
      release: {
        title: "BAD",
        nonce: "1",
        adminAddress: A,
        releaseRegistryId: A,
        tracks: [
          { recordingIndex: 0, splitBps: 5000 },
          { dealId: A, recordingId: A, recordingShareType: share("55"), compositionShareType: share("66"), splitBps: 5000 },
        ],
      },
      misoPackageId: PKG,
      minatoPackageId: PKG,
    })(tx),
  ).toThrow(/cannot mix pre-made deals/);
});
