// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Verifies the client extension binds the miso/minato package ids into the
// publish builders on `misoPlatform.tx`, so callers don't repeat them. Moved
// from @misonetwork/sdk's client.test.ts along with publishComposition et al.
// Building the transactions is offline — no network.

import { test, expect } from "bun:test";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { miso, misoPlatform } from "../src/client.ts";
import { MISO_PLATFORM_DEPLOYMENTS } from "../src/deployments.ts";
import { networkFrom } from "../src/read/config.ts";

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

test("miso() exposes the full platform facade with nested protocol", () => {
  const c = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso());

  expect(c.miso.packageId).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.packages.pressing,
  );
  expect(c.miso.protocol.deployment).toEqual(
    MISO_PLATFORM_DEPLOYMENTS.testnet.protocol,
  );

  const tx = new Transaction();
  c.miso.tx.publishComposition({
    title: "T",
    royaltyRateBps: 1000,
    shareType: SHARE,
    shareCurrencyId: A,
    shareTreasuryCapId: A,
    shareRecipients: [{ address: A, value: 1 }],
    adminAddress: A,
  })(tx);
  const calls = moveCalls(tx);
  expect(
    calls.find((call) => call.module === "composition")?.package,
  ).toBe(MISO_PLATFORM_DEPLOYMENTS.testnet.protocol.packageId);
  expect(calls.find((call) => call.module === "minato")?.package).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.packages.minato,
  );
});

test("miso() fails closed when the platform is not bundled", () => {
  expect(() =>
    new SuiGrpcClient({
      network: "mainnet",
      baseUrl: "https://fullnode.mainnet.sui.io:443",
    }).$extend(miso()),
  ).toThrow(/no bundled Miso platform deployment/);
});

test("bundled deployment includes ids required by platform publishing", () => {
  const { packages } = MISO_PLATFORM_DEPLOYMENTS.testnet;
  expect(packages.royaltyPool).toMatch(/^0x[0-9a-f]{64}$/);
  expect(packages.compositionRoyaltyPool).toMatch(/^0x[0-9a-f]{64}$/);
  expect(packages.recordingRoyaltyPool).toMatch(/^0x[0-9a-f]{64}$/);
  expect(packages.coverArt).toMatch(/^0x[0-9a-f]{64}$/);
  expect(packages.ori).toMatch(/^0x[0-9a-f]{64}$/);
});

test("network parsing defaults only missing values and rejects typos", () => {
  expect(networkFrom(undefined)).toBe("testnet");
  expect(networkFrom("testnet")).toBe("testnet");
  expect(networkFrom("mainnet")).toBe("mainnet");
  expect(() => networkFrom("tesnet")).toThrow(/unsupported network/);
});

test("miso() binds generated platform calls to the selected packages", () => {
  const c = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso());
  const tx = new Transaction();
  c.miso.call.pressing.newActiveState({})(tx);
  expect(
    moveCalls(tx).find(
      (call) => call.module === "pressing" && call.function === "new_active_state",
    )?.package,
  ).toBe(MISO_PLATFORM_DEPLOYMENTS.testnet.packages.pressing);

  c.miso.call.releaseRegistry.id({ arguments: [tx.object(A)] })(tx);
  expect(
    moveCalls(tx).find(
      (call) => call.module === "release_registry" && call.function === "id",
    )?.package,
  ).toBe(MISO_PLATFORM_DEPLOYMENTS.testnet.packages.releaseRegistry);
});

test("miso() binds whole-release graph package ids", () => {
  const c = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso());
  const tx = new Transaction();
  c.miso.tx.publishReleaseGraph({
    compositions: [],
    recordings: [],
    release: {
      title: "R",
      nonce: "1",
      adminAddress: A,
      releaseRegistryId:
        MISO_PLATFORM_DEPLOYMENTS.testnet.objects.releaseRegistry,
      tracks: [
        {
          recordingId: A,
          recordingAdminCapId: A,
          recordingShareType: SHARE,
          compositionShareType: SHARE,
          splitBps: 10_000,
        },
      ],
    },
  })(tx);

  const calls = moveCalls(tx);
  expect(calls.find((call) => call.module === "release")?.package).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.protocol.packageId,
  );
  expect(
    calls.find((call) => call.module === "release_registry")?.package,
  ).toBe(MISO_PLATFORM_DEPLOYMENTS.testnet.packages.releaseRegistry);
});

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

  const withoutMiso = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" }).$extend(
    misoPlatform({ packageId: PRESSING, releaseRegistryPackageId: RELEASE_REGISTRY, releaseRegistryId: A }),
  );
  expect(() =>
    withoutMiso.misoPlatform.tx.publishRelease({
      title: "LP",
      tracks: [],
      releaseId: A,
      releaseNonce: "0",
      adminAddress: A,
    }),
  ).toThrow(/publishRelease/);

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
