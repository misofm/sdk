// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Structural drift gate for the opinionated publish flow: build the
// transaction and assert the generated Move calls are wired with the right
// module/function, type arguments, and argument counts, and that
// borrow-before-share ordering (composition::new → recording::new → publish →
// publish) is preserved now that createComposition/createRecording are
// imported from @misonetwork/sdk across the package boundary.

import { test, expect } from "bun:test";
import { Transaction } from "@mysten/sui/transactions";
import { publishCompositionAndRecording, publishRelease } from "../src/transactions.ts";

const PKG = "0x" + "cd".repeat(32);
const A = "0x" + "ab".repeat(32);

test("publishCompositionAndRecording orders new→new→publish→publish and borrows the composition in-PTB", () => {
  const tx = new Transaction();
  publishCompositionAndRecording({
    title: "LP — Track",
    royaltyRateBps: 1000,
    composition: {
      shareType: `${PKG}::cs::CS`,
      shareCurrencyId: A,
      shareTreasuryCapId: A,
      shareRecipients: [{ address: A, value: 10_000_000_000_000 }],
      adminAddress: A,
    },
    recording: {
      shareType: `${PKG}::rs::RS`,
      shareCurrencyId: A,
      shareTreasuryCapId: A,
      shareRecipients: [{ address: A, value: 9_000_000_000_000 }],
      adminAddress: A,
    },
    misoPackageId: PKG,
    minatoPackageId: PKG,
  })(tx);

  // Full ordered command stream (MoveCalls only, with their raw arguments).
  const data = tx.getData() as {
    commands: { $kind: string; MoveCall?: { module: string; function: string; arguments: { $kind: string; NestedResult?: [number, number] }[] } }[];
  };
  const moveCallStream = data.commands
    .map((c, cmdIndex) => ({ cmdIndex, mc: c.MoveCall }))
    .filter((c): c is { cmdIndex: number; mc: NonNullable<typeof c.mc> } => Boolean(c.mc));
  const label = (m: { module: string; function: string }) => `${m.module}::${m.function}`;

  const seq = moveCallStream.map((c) => label(c.mc));
  const orderOf = (name: string) => seq.indexOf(name);

  // Borrow-before-share ordering is load-bearing.
  expect(orderOf("composition::new")).toBeGreaterThanOrEqual(0);
  expect(orderOf("recording::new")).toBeGreaterThan(orderOf("composition::new"));
  expect(orderOf("composition::publish")).toBeGreaterThan(orderOf("recording::new"));
  expect(orderOf("recording::publish")).toBeGreaterThan(orderOf("composition::publish"));

  // recording::new's first argument must be the composition::new RESULT (an in-PTB
  // borrow), not an external tx.object — this is what makes the single-PTB bundle legal.
  const compNew = moveCallStream.find((c) => label(c.mc) === "composition::new")!;
  const recNew = moveCallStream.find((c) => label(c.mc) === "recording::new")!;
  const compositionArg = recNew.mc.arguments[0]!;
  expect(compositionArg.$kind).toBe("NestedResult");
  // recording::new takes (composition, currency, treasury_cap, max_royalty_rate_bps):
  // the slippage guard is pinned to the in-PTB composition's exact known rate.
  expect(recNew.mc.arguments.length).toBe(4);
  expect(compositionArg.NestedResult![0]).toBe(compNew.cmdIndex); // references composition::new
  expect(compositionArg.NestedResult![1]).toBe(0); // its first return value (the Composition)

  // Both minato disperse calls are present (composition + recording).
  expect(seq.filter((f) => f === "minato::disperse_balance").length).toBe(2);

  // recording::new carries [RecordingShare, CompositionShare] type args.
  const recTypeArgs = (data.commands[recNew.cmdIndex]!.MoveCall as unknown as { typeArguments: string[] }).typeArguments;
  expect(recTypeArgs).toEqual([`${PKG}::rs::RS`, `${PKG}::cs::CS`]);
});

interface ReleaseCall {
  module: string;
  function: string;
  typeArguments?: string[];
  argCount?: number;
}

function releaseCalls(tx: Transaction): ReleaseCall[] {
  const data = tx.getData() as {
    commands: { $kind: string; MoveCall?: { module: string; function: string; typeArguments?: string[]; arguments?: unknown[] } }[];
  };
  return data.commands
    .filter((c) => c.$kind === "MoveCall" && c.MoveCall)
    .map((c) => ({
      module: c.MoveCall!.module,
      function: c.MoveCall!.function,
      typeArguments: c.MoveCall!.typeArguments,
      argCount: c.MoveCall!.arguments?.length,
    }));
}

test("publishRelease wires one track -> registry release -> publish", () => {
  const tx = new Transaction();
  publishRelease({
    title: "LP",
    tracks: [
      { recordingId: A, recordingAdminCapId: A, recordingShareType: `${PKG}::r::R`, compositionShareType: `${PKG}::s::S`, splitBps: 10000 },
    ],
    releaseRegistryPackageId: PKG,
    releaseRegistryId: A,
    releaseId: A,
    releaseNonce: "0",
    misoPackageId: PKG,
    adminAddress: A,
  })(tx);

  const calls = releaseCalls(tx);
  const has = (module: string, fn: string) => calls.some((c) => c.module === module && c.function === fn);
  expect(has("track", "new")).toBe(true);
  expect(has("release_registry", "new_release")).toBe(true);
  expect(has("release", "publish")).toBe(true);
  // track::new carries both share types
  expect(calls.find((c) => c.module === "track" && c.function === "new")!.typeArguments).toEqual([`${PKG}::r::R`, `${PKG}::s::S`]);
  // release_registry::new_release takes (registry, title, tracks, nonce).
  expect(calls.find((c) => c.module === "release_registry" && c.function === "new_release")!.argCount).toBe(4);
  // the admin cap is routed by finalizeRelease, not by the primitive
  const kinds = (tx.getData() as { commands: { $kind: string }[] }).commands.map((c) => c.$kind);
  expect(kinds).toContain("TransferObjects");
});
