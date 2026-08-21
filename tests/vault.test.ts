// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { Transaction } from "@mysten/sui/transactions";
import {
  custodyNewAdminCap,
  initializeCompositionRoyaltyPool,
  installCompositionRoyaltyPoolPlugin,
  installReleaseRevenueDistributorPlugin,
  registerCompositionRoutedStake,
  receivingCoins,
  withAdminCap,
} from "../src/vault.ts";

const VAULT = "0x" + "10".repeat(32);
const COMP_POOL_PLUGIN = "0x" + "20".repeat(32);
const ROUTED_PLUGIN = "0x" + "30".repeat(32);
const REVENUE_PLUGIN = "0x" + "40".repeat(32);
const A = "0x" + "ab".repeat(32);
const CAP = "0x" + "cd".repeat(32) + "::composition::CompositionAdminCap<" + "0x" + "ef".repeat(32) + "::share::Share>";
const COMPOSITION_SHARE = "0x" + "ef".repeat(32) + "::share::Share";
const RECORDING_SHARE = "0x" + "12".repeat(32) + "::share::Share";
const SUI = "0x2::sui::SUI";

interface Call {
  package?: string;
  module: string;
  function: string;
  typeArguments: string[];
}

function calls(tx: Transaction): Call[] {
  const data = tx.getData() as {
    commands: { $kind: string; MoveCall?: Call }[];
  };
  return data.commands
    .filter((command) => command.$kind === "MoveCall" && command.MoveCall)
    .map((command) => command.MoveCall!);
}

test("vault authority encloses protocol work in borrow and exact put-back", () => {
  const tx = new Transaction();
  withAdminCap(
    tx,
    {
      kind: "vault",
      vault: tx.object(A),
      vaultAdminCap: tx.object(A),
      capType: CAP,
      vaultPackageId: VAULT,
    },
    (cap) => {
      tx.moveCall({ target: `${A}::example::uses_cap`, arguments: [cap] });
    },
  );

  const labels = calls(tx).map((call) => `${call.module}::${call.function}`);
  expect(labels).toEqual([
    "vault::borrow_as_admin",
    "example::uses_cap",
    "vault::put_back",
  ]);
  expect(calls(tx)[0]!.typeArguments).toEqual([CAP]);
  expect(calls(tx)[2]!.typeArguments).toEqual([CAP]);
});

test("new capability custody shares the vault and transfers only VaultAdminCap", () => {
  const tx = new Transaction();
  custodyNewAdminCap(tx, {
    adminCap: tx.object(A),
    capType: CAP,
    vaultPackageId: VAULT,
    owner: A,
    configure: (vault, vaultAdminCap) => {
      installCompositionRoyaltyPoolPlugin(tx, {
        vault,
        vaultAdminCap,
        compositionShareType: COMPOSITION_SHARE,
        pluginPackageId: COMP_POOL_PLUGIN,
      });
    },
  });
  const labels = calls(tx).map((call) => `${call.module}::${call.function}`);
  expect(labels).toEqual([
    "vault::new",
    "composition_royalty_pool::install",
    "vault::share",
  ]);
  expect(calls(tx)[1]!.package).toBe(COMP_POOL_PLUGIN);
  const data = tx.getData() as { commands: { $kind: string; TransferObjects?: { objects: { $kind: string; NestedResult?: [number, number] }[] } }[] };
  const transfer = data.commands.find((command) => command.$kind === "TransferObjects")!.TransferObjects!;
  expect(transfer.objects).toHaveLength(1);
  expect(transfer.objects[0]!.NestedResult).toEqual([0, 1]); // VaultAdminCap, never the wrapped raw cap
});

test("plugins build their own witnesses and expose no client-side witness input", () => {
  const tx = new Transaction();
  installReleaseRevenueDistributorPlugin(tx, {
    vault: tx.object(A),
    vaultAdminCap: tx.object(A),
    pluginPackageId: REVENUE_PLUGIN,
  });
  initializeCompositionRoyaltyPool(tx, {
    vault: tx.object(A),
    vaultAdminCap: tx.object(A),
    composition: tx.object(A),
    compositionShareType: COMPOSITION_SHARE,
    currencyType: SUI,
    pluginPackageId: COMP_POOL_PLUGIN,
  });
  const pluginCalls = calls(tx).filter((call) => call.package !== VAULT);
  expect(pluginCalls.map((call) => call.function)).toEqual([
    "install",
    "initialize_pool",
  ]);
  expect(pluginCalls.every((call) => call.module !== "witness")).toBe(true);
});

test("routed-stake registration pins the vault, composition, recording, and canonical pool", () => {
  const tx = new Transaction();
  registerCompositionRoutedStake(tx, {
    vault: tx.object(A),
    vaultAdminCap: tx.object(A),
    composition: tx.object(A),
    recording: tx.object(A),
    routedStake: tx.object(A),
    royaltyPool: tx.object(A),
    compositionShareType: COMPOSITION_SHARE,
    recordingShareType: RECORDING_SHARE,
    currencyType: SUI,
    pluginPackageId: ROUTED_PLUGIN,
  });
  const call = calls(tx)[0]!;
  expect(`${call.module}::${call.function}`).toBe(
    "composition_routed_stake::register",
  );
  expect(call.typeArguments).toEqual([
    RECORDING_SHARE,
    COMPOSITION_SHARE,
    SUI,
  ]);
});

test("receiving coin vectors use exact Receiving inputs, never ordinary object inputs", () => {
  const tx = new Transaction();
  receivingCoins(tx, SUI, [{ objectId: A, version: "7", digest: "11111111111111111111111111111111" }]);
  const inputs = (tx.getData() as { inputs: { $kind: string; Object?: { $kind?: string } }[] }).inputs;
  expect(inputs.some((input) => input.$kind === "Object" && input.Object?.$kind === "Receiving")).toBe(true);
});
