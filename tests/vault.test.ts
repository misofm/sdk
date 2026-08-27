// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { Transaction } from "@mysten/sui/transactions";
import * as vaultApi from "../src/vault.ts";
import {
  custodyNewAdminCap,
  deriveVaultAdminCapId,
  deriveVaultId,
  initializeCompositionRoyaltyPool,
  installCompositionRoyaltyPoolPlugin,
  installReleaseRevenueDistributorPlugin,
  receivePartyWalletBalance,
  redeemPartyWalletBalance,
  registerCompositionRoutedStake,
  receivingCoins,
  sweepCompositionRoyaltyPool,
  sweepPartyWalletBalance,
  sweepRecordingRoyaltyPool,
  invokeWithAdminCap,
  newCompositionRoyaltyPool,
  restoreVaultCapability,
  withdrawVaultCapability,
} from "../src/vault.ts";

const VAULT = "0x" + "10".repeat(32);
const VAULT_REGISTRY = "0x" + "11".repeat(32);
const COMP_POOL_PLUGIN = "0x" + "20".repeat(32);
const ROUTED_PLUGIN = "0x" + "30".repeat(32);
const REVENUE_PLUGIN = "0x" + "40".repeat(32);
const PARTY_WALLET_PLUGIN = "0x" + "50".repeat(32);
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

test("vault authority encloses an independent result in borrow and exact put-back", () => {
  const tx = new Transaction();
  const track = invokeWithAdminCap(
    tx,
    {
      kind: "vault",
      vault: tx.object(A),
      vaultAdminCap: tx.object(A),
      capType: CAP,
      vaultPackageId: VAULT,
    },
    {
      target: `${A}::track::new`,
      arguments: [tx.object(A), tx.pure.id(A), tx.pure.u16(10_000)],
      adminCapIndex: 0,
    },
  );

  const labels = calls(tx).map((call) => `${call.module}::${call.function}`);
  expect(labels).toEqual([
    "vault::borrow_as_admin",
    "track::new",
    "vault::put_back",
  ]);
  expect(calls(tx)[0]!.typeArguments).toEqual([CAP]);
  expect(calls(tx)[2]!.typeArguments).toEqual([CAP]);
  const data = tx.getData() as { commands: { $kind: string; MoveCall?: { arguments: { $kind: string; NestedResult?: [number, number] }[] } }[] };
  // `track` is the target call's own result, while its cap input is the Vault
  // borrow's nested result; no borrowed value is surfaced by the API.
  expect(track.$kind).toBe("Result");
  expect(data.commands[1]!.MoveCall!.arguments[0]!.NestedResult).toEqual([0, 0]);
});

test("vault module exports no borrowed-cap callback helper", () => {
  expect("withAdminCap" in vaultApi).toBe(false);
  expect("withAdminCapResult" in vaultApi).toBe(false);
  expect("destroyVault" in vaultApi).toBe(false);
});

test("Vault and VaultAdminCap derivation matches the deployed Move view vector", () => {
  const vaultId = deriveVaultId({
    vaultRegistryId: "0xee17744a0c6f71bbde98d0c2b4cab58929000fd2f65e28a4676164d34758584b",
    capId: "0x" + "aa".repeat(32),
    capType: "0x5788d67e76b7e6de85ba335731a068ef7cbac7b17504577f293d41c5ba3d1ff0::release::ReleaseAdminCap",
    vaultPackageId: "0xfe396139d500e4381adefea72da2e0157c54ee5c38cc8bdcbc4edd551d043230",
  });
  expect(vaultId).toBe("0x296d2bb945c4104222a16636c94c35fc93e5ebc91fd95d0b7e0e3b1df6da3f4d");
  expect(deriveVaultAdminCapId(
    vaultId,
    "0xfe396139d500e4381adefea72da2e0157c54ee5c38cc8bdcbc4edd551d043230",
  )).toBe("0x4071674f4f4c05155d1a11096ddf1ee4a18dfe9777553432705af23d29213c57");
});

test("withdraw and restore preserve the permanent Vault shell", () => {
  const tx = new Transaction();
  const adminCap = withdrawVaultCapability(tx, {
    vault: A,
    vaultAdminCap: A,
    capType: CAP,
    vaultPackageId: VAULT,
  });
  restoreVaultCapability(tx, {
    vault: A,
    vaultAdminCap: A,
    adminCap,
    capType: CAP,
    vaultPackageId: VAULT,
  });
  expect(adminCap.$kind).toBe("Result");
  expect(calls(tx).map((call) => `${call.module}::${call.function}`)).toEqual([
    "vault::withdraw_cap",
    "vault::restore_cap",
  ]);
});

test("new capability custody shares the vault and transfers only VaultAdminCap", () => {
  const tx = new Transaction();
  custodyNewAdminCap(tx, {
    adminCap: tx.object(A),
    vaultRegistry: VAULT_REGISTRY,
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
    "vault::transfer_admin_cap",
  ]);
  expect(calls(tx)[1]!.package).toBe(COMP_POOL_PLUGIN);
  const data = tx.getData() as { commands: { $kind: string; MoveCall?: { module: string; function: string; arguments: { $kind: string; NestedResult?: [number, number] }[] } }[] };
  expect(data.commands.some((command) => command.$kind === "TransferObjects")).toBe(false);
  const transfer = data.commands.find((command) =>
    command.MoveCall?.module === "vault" &&
    command.MoveCall.function === "transfer_admin_cap"
  )!.MoveCall!;
  expect(transfer.arguments[0]!.NestedResult).toEqual([0, 1]); // VaultAdminCap, never the raw cap
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

test("royalty-pool constructors return the unshared pool for same-PTB registration", () => {
  const tx = new Transaction();
  const pool = newCompositionRoyaltyPool(tx, {
    vault: tx.object(A),
    vaultAdminCap: tx.object(A),
    composition: tx.object(A),
    compositionShareType: COMPOSITION_SHARE,
    currencyType: SUI,
    pluginPackageId: COMP_POOL_PLUGIN,
  });
  expect(pool.$kind).toBe("Result");
  expect(calls(tx).map((call) => `${call.module}::${call.function}`)).toEqual([
    "composition_royalty_pool::new_pool",
  ]);
});

test("royalty-pool cranks sweep the settled accumulator snapshot without an amount", () => {
  const tx = new Transaction();
  sweepCompositionRoyaltyPool(tx, {
    vault: tx.object(A),
    composition: tx.object(A),
    pool: tx.object(A),
    accumulatorRoot: tx.object(A),
    compositionShareType: COMPOSITION_SHARE,
    currencyType: SUI,
    pluginPackageId: COMP_POOL_PLUGIN,
  });
  sweepRecordingRoyaltyPool(tx, {
    vault: tx.object(A),
    recording: tx.object(A),
    pool: tx.object(A),
    accumulatorRoot: tx.object(A),
    recordingShareType: RECORDING_SHARE,
    compositionShareType: COMPOSITION_SHARE,
    currencyType: SUI,
    pluginPackageId: COMP_POOL_PLUGIN,
  });

  const cranks = calls(tx).filter((call) => call.function === "sweep_and_deposit");
  expect(cranks.map((call) => call.module)).toEqual([
    "composition_royalty_pool",
    "recording_royalty_pool",
  ]);
});

test("party-wallet monetary builders return composable Balance results", () => {
  const tx = new Transaction();
  const common = {
    vault: tx.object(A),
    party: tx.object(A),
    vaultAdminCap: tx.object(A),
    currencyType: SUI,
    pluginPackageId: PARTY_WALLET_PLUGIN,
  };
  const received = receivePartyWalletBalance(tx, {
    ...common,
    coins: [{ objectId: A, version: "7", digest: "11111111111111111111111111111111" }],
  });
  const redeemed = redeemPartyWalletBalance(tx, { ...common, value: 7n });
  const swept = sweepPartyWalletBalance(tx, {
    ...common,
    accumulatorRoot: tx.object(A),
  });

  for (const balance of [received, redeemed, swept]) {
    const coin = tx.moveCall({
      target: "0x2::coin::from_balance",
      typeArguments: [SUI],
      arguments: [balance],
    });
    tx.transferObjects([coin], tx.pure.address(A));
  }

  expect([received.$kind, redeemed.$kind, swept.$kind]).toEqual([
    "Result",
    "Result",
    "Result",
  ]);
  expect(
    calls(tx)
      .filter((call) => call.module === "party_wallet")
      .map((call) => call.function),
  ).toEqual(["receive_coins", "redeem_balance", "sweep_balance"]);
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
