// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  Transaction,
  type ParallelTransactionExecutor,
} from "@mysten/sui/transactions";
import {
  MisoChainIdentifierMismatchError,
  MisoClientNotReadyError,
  MisoNetworkMismatchError,
  miso,
  misoPlatform,
} from "../src/client.ts";
import {
  getMisoPlatformDeployment,
  MISO_PLATFORM_DEPLOYMENTS,
  OperationsUnavailableError,
  RecordSalesUnavailableError,
  requireOperationsDeployment,
  requireRecordSalesDeployment,
  type MisoPlatformDeployment,
  type OperationsDeployment,
} from "../src/deployments.ts";
import {
  MISO_PACKAGE_NAMES,
  type MisoDeployment,
} from "@misonetwork/sdk/deployments";
import { networkFrom } from "../src/read/config.ts";

const RECORD = `0x${"12".repeat(32)}`;
const SHOP = `0x${"13".repeat(32)}`;
const MISO = `0x${"cd".repeat(32)}`;
const MINATO = `0x${"ef".repeat(32)}`;
const A = `0x${"11".repeat(32)}`;
const id = (value: number) => `0x${value.toString(16).padStart(64, "0")}`;

const OPERATIONS = {
  status: "available",
  vault: { packageId: id(101), registryId: id(201) },
  actions: {
    compositionRoyaltyPool: id(102),
    recordingRoyaltyPool: id(103),
    partyWallet: id(104),
    compositionRoutedStake: id(105),
    releaseRevenueDistributor: id(106),
  },
  plugins: {
    compositionRoyaltyPool: id(107),
    recordingRoyaltyPool: id(108),
    releaseRevenueDistributor: id(109),
  },
} as const satisfies OperationsDeployment;

const NETWORK_DEPLOYMENT = Object.fromEntries(
  MISO_PACKAGE_NAMES.map((name, index) => [
    name,
    name === "miso" ? MISO : `0x${(index + 1).toString(16).padStart(64, "0")}`,
  ]),
) as MisoDeployment;

const DEPLOYMENT = {
  network: "testnet",
  chainIdentifier: "testnet-chain-identifier",
  protocol: NETWORK_DEPLOYMENT,
  recordSales: {
    status: "available",
    recordPackageId: RECORD,
    recordShopPackageId: SHOP,
  },
  operations: OPERATIONS,
  packages: {
    minato: MINATO,
    releaseCoverArt: A,
    releaseCredits: A,
    routedStake: A,
  },
  objects: { releaseRegistry: A, genreRegistry: A },
} as unknown as MisoPlatformDeployment;

interface Call {
  package?: string;
  module: string;
  function: string;
}
function moveCalls(tx: Transaction): Call[] {
  return (tx.getData().commands as Array<{ $kind: string; MoveCall?: Call }>)
    .filter((command) => command.$kind === "MoveCall")
    .map((command) => command.MoveCall!);
}

test("explicit verified deployment binds both finalized sales packages", async () => {
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => ({ chainIdentifier: DEPLOYMENT.chainIdentifier }),
  });
  const client = base.$extend(miso({ deployment: DEPLOYMENT }));
  await client.miso.ready();
  expect(client.miso.recordPackageId).toBe(RECORD);
  expect(client.miso.recordShopPackageId).toBe(SHOP);

  const tx = new Transaction();
  client.miso.tx.purchaseRecord({
    releaseId: A,
    edition: 1,
    currencyType: "0x2::sui::SUI",
    paymentAmount: "10",
    expectedPricing: { kind: "fixed", amount: "10" },
    recipient: A,
  })(tx);
  const calls = moveCalls(tx);
  expect(calls.find((call) => call.function === "fixed")?.package).toBe(SHOP);
  expect(calls.find((call) => call.function === "purchase")?.package).toBe(
    SHOP,
  );
  expect(
    tx
      .getData()
      .commands.some((command) => command.$kind === "TransferObjects"),
  ).toBeTrue();
});

test("configured client exposes safe raw modules without witness or mint", () => {
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso({ deployment: DEPLOYMENT }));
  expect(client.miso.call.record).toBeDefined();
  expect(client.miso.call.listing).toBeDefined();
  expect(client.miso.call.pressing).toBeDefined();
  expect((client.miso.call as Record<string, unknown>).witness).toBeUndefined();
  expect(
    (client.miso.call.pressing as Record<string, unknown>).mint,
  ).toBeUndefined();
});

test("an available operations deployment binds all nine exact package targets", async () => {
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => ({ chainIdentifier: DEPLOYMENT.chainIdentifier }),
  });
  const client = base.$extend(miso({ deployment: DEPLOYMENT }));
  await client.miso.ready();
  const tx = new Transaction();
  const share = `${id(301)}::share::Share`;
  const currency = "0x2::sui::SUI";
  const cap = `${MISO}::release::ReleaseAdminCap`;

  tx.add(client.miso.call.vault!.capId({
    arguments: [tx.object(A)],
    typeArguments: [cap],
  }));
  tx.add(client.miso.call.compositionRoyaltyPool!.poolAddress({
    arguments: [tx.object(A)],
    typeArguments: [share, currency],
  }));
  tx.add(client.miso.call.recordingRoyaltyPool!.poolAddress({
    arguments: [tx.object(A)],
    typeArguments: [share, share, currency],
  }));
  tx.add(client.miso.call.partyWallet!.inboxAddress({
    arguments: [tx.object(A)],
  }));
  tx.add(client.miso.call.compositionRoutedStake!.stakeAddress({
    arguments: [tx.object(A)],
    typeArguments: [share, share],
  }));
  tx.add(client.miso.call.releaseRevenueDistributor!.redeemAllAndDistribute({
    arguments: [tx.object(A), tx.object(A), tx.object("0xacc")],
    typeArguments: [currency],
  }));
  tx.add(client.miso.call.compositionRoyaltyPoolPlugin!.isInstalled({
    arguments: [tx.object(A)],
    typeArguments: [share],
  }));
  tx.add(client.miso.call.recordingRoyaltyPoolPlugin!.isInstalled({
    arguments: [tx.object(A)],
    typeArguments: [share],
  }));
  tx.add(client.miso.call.releaseRevenueDistributorPlugin!.isInstalled({
    arguments: [tx.object(A)],
  }));

  expect(moveCalls(tx).map((call) => call.package)).toEqual([
    OPERATIONS.vault.packageId,
    OPERATIONS.actions.compositionRoyaltyPool,
    OPERATIONS.actions.recordingRoyaltyPool,
    OPERATIONS.actions.partyWallet,
    OPERATIONS.actions.compositionRoutedStake,
    OPERATIONS.actions.releaseRevenueDistributor,
    OPERATIONS.plugins.compositionRoyaltyPool,
    OPERATIONS.plugins.recordingRoyaltyPool,
    OPERATIONS.plugins.releaseRevenueDistributor,
  ]);
});

test("bundled legacy deployment remains explicit and all new sales APIs fail closed", () => {
  expect(MISO_PLATFORM_DEPLOYMENTS.testnet.recordSales.status).toBe(
    "unavailable",
  );
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso());
  expect(() =>
    client.miso.tx.purchaseRecord({
      releaseId: A,
      edition: 1,
      currencyType: "0x2::sui::SUI",
      paymentAmount: 1,
      expectedPricing: { kind: "fixed", amount: 1 },
      recipient: A,
    }),
  ).toThrow(RecordSalesUnavailableError);
  expect(() => client.miso.protocol).toThrow(MisoClientNotReadyError);
  expect(client.miso.deployment?.protocol.miso).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.protocol.miso,
  );
  expect(MISO_PLATFORM_DEPLOYMENTS.testnet.operations.status).toBe("unavailable");
  expect(client.miso.vault).toBeUndefined();
  for (const name of [
    "vault",
    "compositionRoyaltyPool",
    "recordingRoyaltyPool",
    "partyWallet",
    "compositionRoutedStake",
    "releaseRevenueDistributor",
    "compositionRoyaltyPoolPlugin",
    "recordingRoyaltyPoolPlugin",
    "releaseRevenueDistributorPlugin",
  ]) {
    expect((client.miso.call as Record<string, unknown>)[name]).toBeUndefined();
  }
  expect(() => client.miso.ids.vault(A, `${MISO}::release::ReleaseAdminCap`))
    .toThrow(OperationsUnavailableError);
  expect(MISO_PLATFORM_DEPLOYMENTS.testnet.packages).not.toHaveProperty("vault");
  expect(MISO_PLATFORM_DEPLOYMENTS.testnet.objects).not.toHaveProperty("vaultRegistry");
});

test("bare platform config without finalized package identities fails sales closed", () => {
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(misoPlatform({}));
  expect(client.misoPlatform.protocol).toBeUndefined();
  expect(() => client.misoPlatform.ids.pressing(A, 1)).toThrow(
    /without Record and Record Shop/,
  );
});

test("deployment/network selection remains fail closed", () => {
  expect(getMisoPlatformDeployment("testnet")).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet,
  );
  expect(() => getMisoPlatformDeployment("mainnet")).toThrow(/no bundled/);
  expect(networkFrom(undefined)).toBe("testnet");
  expect(networkFrom("mainnet")).toBe("mainnet");
  expect(() => networkFrom("tesnet")).toThrow(/unsupported network/);
});

test("explicit deployment registration rejects a mismatched client network synchronously", () => {
  const client = new SuiGrpcClient({
    network: "mainnet",
    baseUrl: "https://fullnode.mainnet.sui.io:443",
  });
  expect(() => client.$extend(miso({ deployment: DEPLOYMENT }))).toThrow(
    MisoNetworkMismatchError,
  );
});

test("ready memoizes exact-chain validation and gates synchronous builders", async () => {
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  let calls = 0;
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => {
      calls += 1;
      return { chainIdentifier: DEPLOYMENT.chainIdentifier };
    },
  });
  const client = base.$extend(miso({ deployment: DEPLOYMENT }));
  expect(() =>
    client.miso.tx.purchaseRecord({
      releaseId: A,
      edition: 1,
      currencyType: "0x2::sui::SUI",
      paymentAmount: 1,
      expectedPricing: { kind: "fixed", amount: 1 },
      recipient: A,
    }),
  ).toThrow(MisoClientNotReadyError);
  expect(() =>
    client.miso.call.record!.deriveAddress({
      arguments: [A, 1],
    }),
  ).toThrow(MisoClientNotReadyError);

  const first = client.miso.ready();
  const second = client.miso.ready();
  expect(first).toBe(second);
  await Promise.all([first, second]);
  expect(calls).toBe(1);
  expect(await client.miso.validateChainIdentifier()).toBe(
    DEPLOYMENT.chainIdentifier,
  );
  expect(calls).toBe(1);
});

test("protocol and nested Party surfaces cannot read or build before readiness", async () => {
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  let chainReads = 0;
  let objectReads = 0;
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => {
      chainReads += 1;
      return { chainIdentifier: DEPLOYMENT.chainIdentifier };
    },
  });
  Object.defineProperty(base.core, "getObject", {
    configurable: true,
    value: async () => {
      objectReads += 1;
      return { object: { content: undefined } };
    },
  });
  const client = base.$extend(miso({ deployment: DEPLOYMENT }));
  const tx = new Transaction();

  expect(() => client.miso.protocol!.getReleaseById(A)).toThrow(
    MisoClientNotReadyError,
  );
  expect(() => client.miso.protocol!.party.getPartyById(A)).toThrow(
    MisoClientNotReadyError,
  );
  expect(() =>
    tx.add(
      client.miso.protocol!.call.release.releaseRegistryId({
        arguments: [A],
      }),
    ),
  ).toThrow(MisoClientNotReadyError);
  expect(() =>
    tx.add(
      client.miso.protocol!.packages.call.core.release.releaseRegistryId({
        arguments: [A],
      }),
    ),
  ).toThrow(MisoClientNotReadyError);
  expect(() =>
    tx.add(client.miso.protocol!.party.call.party.newIndividualKind({})),
  ).toThrow(MisoClientNotReadyError);
  expect(tx.getData().commands).toHaveLength(0);
  expect(tx.getData().inputs).toHaveLength(0);
  expect(objectReads).toBe(0);
  expect(chainReads).toBe(0);

  await Promise.all([client.miso.ready(), client.miso.ready()]);
  expect(chainReads).toBe(1);
  tx.add(
    client.miso.protocol!.call.release.releaseRegistryId({ arguments: [A] }),
  );
  tx.add(
    client.miso.protocol!.packages.call.core.release.releaseRegistryId({
      arguments: [A],
    }),
  );
  tx.add(client.miso.protocol!.party.call.party.newIndividualKind({}));
  expect(moveCalls(tx).map((call) => call.package)).toEqual([
    MISO,
    MISO,
    NETWORK_DEPLOYMENT.misoParty,
  ]);

  await expect(client.miso.protocol!.getReleaseById(A)).rejects.toThrow(
    /Release not found/,
  );
  await expect(client.miso.protocol!.party.getPartyById(A)).rejects.toThrow(
    /Party not found/,
  );
  expect(objectReads).toBe(2);
  await client.miso.ready();
  expect(chainReads).toBe(1);
});

test("deprecated misoPlatform protocol access uses the same explicit readiness gate", async () => {
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  let chainReads = 0;
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => {
      chainReads += 1;
      return { chainIdentifier: DEPLOYMENT.chainIdentifier };
    },
  });
  const client = base.$extend(
    misoPlatform({
      network: "testnet",
      chainIdentifier: DEPLOYMENT.chainIdentifier,
      misoPackageId: MISO,
    }),
  );
  expect(() => client.misoPlatform.protocol).toThrow(MisoClientNotReadyError);
  expect(chainReads).toBe(0);
  await client.misoPlatform.ready();
  expect(client.misoPlatform.protocol?.deployment.packageId).toBe(MISO);
  expect(chainReads).toBe(1);
});

test("high-level online reads await readiness automatically", async () => {
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  let chainReads = 0;
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => {
      chainReads += 1;
      return { chainIdentifier: DEPLOYMENT.chainIdentifier };
    },
  });
  Object.defineProperty(base.core, "getObject", {
    configurable: true,
    value: async () => ({ object: null }),
  });
  const client = base.$extend(miso({ deployment: DEPLOYMENT }));
  expect(await client.miso.getRecord(A)).toBeNull();
  expect(chainReads).toBe(1);
});

test("ready rejects a mismatched exact chain identifier", async () => {
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => ({ chainIdentifier: "wrong-ledger" }),
  });
  const client = base.$extend(miso({ deployment: DEPLOYMENT }));
  await expect(client.miso.ready()).rejects.toBeInstanceOf(
    MisoChainIdentifierMismatchError,
  );
  let executions = 0;
  const executor = {
    executeTransaction: async () => {
      executions += 1;
      throw new Error("must not execute");
    },
  } as unknown as ParallelTransactionExecutor;
  await expect(
    client.miso.executeViaExecutor(executor, () => {}),
  ).rejects.toBeInstanceOf(MisoChainIdentifierMismatchError);
  expect(executions).toBe(0);
});

test("available operations reject invalid, partial, or aliased identities", () => {
  expect(requireOperationsDeployment(OPERATIONS)).toBe(OPERATIONS);

  const invalid = {
    ...OPERATIONS,
    actions: { ...OPERATIONS.actions, partyWallet: "0x12" },
  } as OperationsDeployment;
  const duplicate = {
    ...OPERATIONS,
    plugins: {
      ...OPERATIONS.plugins,
      releaseRevenueDistributor: OPERATIONS.actions.releaseRevenueDistributor,
    },
  } as OperationsDeployment;
  const partial = {
    status: "available",
    vault: OPERATIONS.vault,
    actions: OPERATIONS.actions,
    plugins: {
      compositionRoyaltyPool: OPERATIONS.plugins.compositionRoyaltyPool,
    },
  } as unknown as OperationsDeployment;

  for (const deployment of [invalid, duplicate, partial]) {
    expect(() => requireOperationsDeployment(deployment)).toThrow(
      OperationsUnavailableError,
    );
  }
});

test("unavailable legacy IDs never become current operations ABIs", () => {
  const legacy = {
    status: "unavailable",
    reason: "legacy combined packages",
    legacy: {
      vaultPackageId: OPERATIONS.vault.packageId,
      vaultRegistryId: OPERATIONS.vault.registryId,
      packageIds: {
        compositionRoyaltyPool: OPERATIONS.actions.compositionRoyaltyPool,
      },
    },
  } as const satisfies OperationsDeployment;
  expect(() => requireOperationsDeployment(legacy)).toThrow(
    OperationsUnavailableError,
  );
});

test("the Vault registry cannot alias any operations package identity", () => {
  const aliased = {
    ...OPERATIONS,
    vault: {
      ...OPERATIONS.vault,
      registryId: OPERATIONS.actions.partyWallet,
    },
  } as OperationsDeployment;
  expect(() => requireOperationsDeployment(aliased)).toThrow(
    OperationsUnavailableError,
  );
});

test("available Record sales require distinct canonical package IDs", () => {
  const available = (recordPackageId: string, recordShopPackageId: string) => ({
    status: "available" as const,
    recordPackageId,
    recordShopPackageId,
  });

  expect(requireRecordSalesDeployment(available(RECORD, SHOP))).toEqual(
    available(RECORD, SHOP),
  );
  for (const deployment of [
    available("0x12", SHOP),
    available(`0x${"AB".repeat(32)}`, SHOP),
    available(`0x${"gg".repeat(32)}`, SHOP),
    available(RECORD, RECORD),
  ]) {
    expect(() => requireRecordSalesDeployment(deployment)).toThrow(
      RecordSalesUnavailableError,
    );
  }
});
