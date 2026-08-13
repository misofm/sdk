// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Structural gate for the royalty-pool extension facade: assert each attach helper
// emits `initialize_pool` then `pool::share` with the right packages and type args.

import { test, expect } from "bun:test";
import { Transaction } from "@mysten/sui/transactions";
import { attachCompositionRoyaltyPool, attachRecordingRoyaltyPool } from "../src/extensions/royalty-pool.ts";

const COMP_POOL = "0x" + "c0".repeat(32);
const REC_POOL = "0x" + "d0".repeat(32);
const BASE_POOL = "0x" + "e0".repeat(32);
const A = "0x" + "ab".repeat(32);
const CURRENCY = "0x2::sui::SUI";
const CS = "0x" + "11".repeat(32) + "::share::Share";
const RS = "0x" + "22".repeat(32) + "::share::Share";

interface Call {
  package?: string;
  module: string;
  function: string;
  typeArguments: string[];
}
function moveCalls(tx: Transaction): Call[] {
  const data = tx.getData() as { commands: { $kind: string; MoveCall?: Call }[] };
  return data.commands.filter((c) => c.$kind === "MoveCall" && c.MoveCall).map((c) => c.MoveCall!);
}

test("attachCompositionRoyaltyPool: initialize_pool then pool::share, [CompShare, Currency]", () => {
  const tx = new Transaction();
  attachCompositionRoyaltyPool(tx, {
    composition: tx.object(A),
    adminCap: tx.object(A),
    compositionShareType: CS,
    currency: CURRENCY,
    compositionRoyaltyPoolPackageId: COMP_POOL,
    royaltyPoolPackageId: BASE_POOL,
  });
  const calls = moveCalls(tx);
  const init = calls.find((c) => c.module === "composition_royalty_pool" && c.function === "initialize_pool")!;
  const share = calls.find((c) => c.module === "pool" && c.function === "share")!;
  expect(init.package).toBe(COMP_POOL);
  expect(init.typeArguments).toEqual([CS, CURRENCY]);
  expect(share.package).toBe(BASE_POOL);
  expect(share.typeArguments).toEqual([CS, CURRENCY]);
  // initialize_pool must precede share (share consumes the returned pool).
  expect(calls.indexOf(init)).toBeLessThan(calls.indexOf(share));
});

test("attachRecordingRoyaltyPool: initialize_pool [RecShare, CompShare, Currency], share [RecShare, Currency]", () => {
  const tx = new Transaction();
  attachRecordingRoyaltyPool(tx, {
    recording: tx.object(A),
    adminCap: tx.object(A),
    recordingShareType: RS,
    compositionShareType: CS,
    currency: CURRENCY,
    recordingRoyaltyPoolPackageId: REC_POOL,
    royaltyPoolPackageId: BASE_POOL,
  });
  const calls = moveCalls(tx);
  const init = calls.find((c) => c.module === "recording_royalty_pool" && c.function === "initialize_pool")!;
  const share = calls.find((c) => c.module === "pool" && c.function === "share")!;
  expect(init.package).toBe(REC_POOL);
  expect(init.typeArguments).toEqual([RS, CS, CURRENCY]);
  expect(share.package).toBe(BASE_POOL);
  expect(share.typeArguments).toEqual([RS, CURRENCY]);
});
