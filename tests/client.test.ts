// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Verifies the client extension binds the miso/minato package ids into the
// publish builders on `misoPlatform.tx`, so callers don't repeat them. Moved
// from @misonetwork/sdk's client.test.ts along with publishComposition et al.
// Building the transactions is offline — no network.

import { test, expect } from "bun:test";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { misoPlatform } from "../src/client.ts";

const PRESSING = "0x" + "12".repeat(32);
const MISO = "0x" + "cd".repeat(32);
const MINATO = "0x" + "ef".repeat(32);
const RELEASE_REGISTRY = "0x" + "34".repeat(32);
const SHARE = "0x" + "ab".repeat(32) + "::share::Share";
const A = "0x" + "11".repeat(32);

function client() {
  return new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" }).$extend(
    misoPlatform({ packageId: PRESSING, misoPackageId: MISO, minatoPackageId: MINATO, releaseRegistryPackageId: RELEASE_REGISTRY, releaseRegistryId: A }),
  );
}

interface Call {
  package?: string;
  module: string;
  function: string;
}

function moveCalls(tx: Transaction): Call[] {
  const data = tx.getData() as { commands: { $kind: string; MoveCall?: Call }[] };
  return data.commands.filter((c) => c.$kind === "MoveCall" && c.MoveCall).map((c) => c.MoveCall!);
}

test("client.misoPlatform.tx.publishComposition binds miso + minato package ids", () => {
  const tx = new Transaction();
  client().misoPlatform.tx.publishComposition({
    title: "T",
    royaltyRateBps: 1000,
    shareType: SHARE,
    shareCurrencyId: A,
    shareTreasuryCapId: A,
    shareRecipients: [{ address: A, value: 1 }],
    adminAddress: A,
  })(tx);

  const calls = moveCalls(tx);
  const compNew = calls.find((c) => c.module === "composition" && c.function === "new");
  expect(compNew?.package).toBe(MISO); // miso bound
  const disperse = calls.find((c) => c.module === "minato" && c.function === "disperse_balance");
  expect(disperse?.package).toBe(MINATO); // minato bound
});

test("client without misoPackageId/minatoPackageId throws on publish builders, not on pressing builders", () => {
  const sellOnly = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" }).$extend(
    misoPlatform({ packageId: PRESSING }),
  );

  expect(() =>
    sellOnly.misoPlatform.tx.publishComposition({
      title: "T",
      royaltyRateBps: 1000,
      shareType: SHARE,
      shareCurrencyId: A,
      shareTreasuryCapId: A,
      shareRecipients: [{ address: A, value: 1 }],
      adminAddress: A,
    }),
  ).toThrow(/misoPackageId.*is required/);

  // Builders that never touch the protocol/minato must keep working without them.
  const tx = new Transaction();
  sellOnly.misoPlatform.tx.openPressing({
    releaseId: A,
    releaseAdminCapId: A,
    listings: [],
    adminCapRecipient: A,
  })(tx);
  expect(moveCalls(tx).find((c) => c.module === "pressing" && c.function === "new")?.package).toBe(PRESSING);
});

test("client.misoPlatform.tx.publishRelease binds the registry package and object", () => {
  const tx = new Transaction();
  client().misoPlatform.tx.publishRelease({
    title: "LP",
    tracks: [{ recordingId: A, recordingAdminCapId: A, recordingShareType: SHARE, compositionShareType: SHARE, splitBps: 10000 }],
    releaseId: A,
    releaseNonce: "0",
    adminAddress: A,
  })(tx);

  const registry = moveCalls(tx).find((call) => call.module === "release_registry" && call.function === "new_release");
  expect(registry?.package).toBe(RELEASE_REGISTRY);
});
