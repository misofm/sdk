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
  type MisoPlatformConfig,
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
} from "@misofm/protocol/deployments";
import { networkFrom } from "../src/read/config.ts";

const RECORD = `0x${"12".repeat(32)}`;
const SHOP = `0x${"13".repeat(32)}`;
const MISO = `0x${"cd".repeat(32)}`;
const MINATO = `0x${"ef".repeat(32)}`;
const A = `0x${"11".repeat(32)}`;
const id = (value: number) => `0x${value.toString(16).padStart(64, "0")}`;

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

function expectRecursivelyFrozen(value: unknown, path = "deployment"): void {
  if (!value || typeof value !== "object") return;
  expect(Object.isFrozen(value), path).toBeTrue();
  for (const [key, nested] of Object.entries(value)) {
    expectRecursivelyFrozen(nested, `${path}.${key}`);
  }
}

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

test("configured client binds composable streaming-transcode attach and unset builders", async () => {
  const streamingPackage = id(110);
  const oriPackage = id(111);
  const deployment = {
    ...DEPLOYMENT,
    packages: {
      ...DEPLOYMENT.packages,
      recordingStreamingTranscode: streamingPackage,
      ori: oriPackage,
    },
  } as MisoPlatformDeployment;
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => ({ chainIdentifier: deployment.chainIdentifier }),
  });
  const client = base.$extend(miso({ deployment }));
  await client.miso.ready();

  const target = {
    recordingId: A,
    authority: { kind: "direct" as const, adminCap: id(112) },
    recordingShareType: `${id(113)}::share::Share`,
    compositionShareType: `${id(114)}::share::Share`,
  };
  const tx = new Transaction();
  client.miso.tx.setRecordingStreamingTranscode({
    ...target,
    quiltId: 42n,
  })(tx);
  client.miso.tx.unsetRecordingStreamingTranscode(target)(tx);

  expect(moveCalls(tx).map((call) => `${call.module}::${call.function}`)).toEqual([
    "data::new_quilt",
    "recording_streaming_transcode::new",
    "recording_streaming_transcode::set_streaming_transcode",
    "recording_streaming_transcode::unset_streaming_transcode",
  ]);
  expect(client.miso.call.recordingStreamingTranscode).toBeDefined();
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
    arguments: [tx.object(A), tx.object(A)],
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

test("bundled Testnet deployment exposes the verified sales and operations ABIs", async () => {
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => ({
      chainIdentifier: MISO_PLATFORM_DEPLOYMENTS.testnet.chainIdentifier,
    }),
  });
  const client = base.$extend(miso());
  await client.miso.ready();

  expect(MISO_PLATFORM_DEPLOYMENTS.testnet.recordSales.status).toBe("available");
  expect(MISO_PLATFORM_DEPLOYMENTS.testnet.operations.status).toBe("available");
  expect(client.miso.deployment?.protocol.miso).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.protocol.miso,
  );
  expect(client.miso.recordPackageId).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.recordSales.recordPackageId,
  );
  expect(client.miso.recordShopPackageId).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.recordSales.recordShopPackageId,
  );
  expect(client.miso.vault).toBeDefined();
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
    expect((client.miso.call as Record<string, unknown>)[name]).toBeDefined();
  }
  expect(
    client.miso.ids.vault(A, `${MISO}::release::ReleaseAdminCap`),
  ).toMatch(/^0x[0-9a-f]{64}$/);
  expect(MISO_PLATFORM_DEPLOYMENTS.testnet.packages).not.toHaveProperty("vault");
  expect(MISO_PLATFORM_DEPLOYMENTS.testnet.objects).not.toHaveProperty("vaultRegistry");
});

test("bundled Testnet deployment exactly matches the verified immutable export", () => {
  expect(MISO_PLATFORM_DEPLOYMENTS.testnet).toEqual({
    network: "testnet",
    chainIdentifier: "69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD",
    protocol: {
      miso: "0xd3135400c8852a5c276c489bda3ebc97acb9cb440f415d05a4db5062f5592e7b",
      compositionCredits: "0xc58ac5d69740866f6514f68f2e9c86b1d069d819ad0bcf5384b6aaa66e0fbf53",
      recordingAdvisory: "0x23abf3f248466c08edc3349b202d6e809064c0e52098ff290cef1fdc51d5942e",
      recordingCredits: "0x7bafa653854f0820d911b8f6aa0aac3b131163c254b0021330881b77206d4d79",
      recordingLanguage: "0xb3e1c578638a79acc7ab573c994206047ad8ef76893f9c5c987887c5b10a5c68",
      recordingMasterReference: "0x92a752854b80a6103721743125ee48223b577a023fe360e25d3aa695462a6d15",
      recordingPreview: "0x2be8405f6b77a30d6942cb240c0d804d608ef761395e6f861b71d9ae3c98f997",
      releaseCoverArt: "0x4f0a8736685f6b1ddbcd0bddcd7aae2d072aa3d4043efc0ad4042a7786068999",
      releaseCredits: "0x47ccd23c669b023b8678193e7748235916e16e737fdd8ba48b131ded29c76a00",
      releaseDescription: "0x50f5acf7c0c05cdc7656072fd1bfc5ee76d02beabeae090103734b2d75118fa3",
      releaseDspLink: "0x9ca9ad8cab49c4897cd3cb89628b771ee4f10831ddc273036837751a5339d02a",
      releaseGenre: "0xfb73b04be2f72704ec5e6a1035bfab108e5ee2a72e72c0505f999291e23219bd",
      releaseKind: "0xfb2e5790f0577aca3ac8ddd672c4c58ef1e49ef1c3dfe14fb9676aaabf769169",
      royaltyPool: "0xecaa5a29cf8e110face3b80f0e4a5554e8c80edd8eda0983ed2f8015367eecca",
      routedStake: "0x30ed387d3fea69579ddb34d011fa6e1416580bfb3ee6587aabf103fb0d17bced",
      misoParty: "0xd665048a47aa6a75be2d8005bf7d4fa7b0decfb9eea3bd80704a07bc423477f5",
      partyCta: "0x0c0456395d9c5d45b5db64388a61f6ea55e876b892079ba75afe80265b6b9421",
      partyGenre: "0x692886e74a7059ac8b41cbb10d79e0b64a131199764febd5cc5ff130a5d7c0fa",
      partyMedia: "0x24723643ac0631b5fa2c7fce05201c535856f9c738ccf244a2ee1ef0f3d352a7",
      partyMusic: "0x59feb686f0c62fb2d3f37ffa4893a237f3aec3833c2103c9b5f9c33af8afc807",
      partyPlatformLink: "0x0993d48b20590e3528c2c28216d2dbb528ecc4faa255711dd6df822cb390871a",
      partyProLink: "0xc2adf0cd2f0e0a9c824cff18d09f6258d41d7131e626b1fe568150f036b96974",
      partyProfile: "0xcbc13c97422863c3db41a832f4f00616f29f1d5faef02c924d01b85b5878e8a4",
      partyRoles: "0xbc32130038e2b7e0e703cb0b2b0f8927047855e832791343495d07acf6eae724",
      partySocial: "0x267ac643ab38c5b185fd566c0c90a4bbdfedb3b81a8643f2cd1385270782bd45",
      partyTags: "0x7c12c2837c2949ae56b61047ca74563421de4aaaf8cb8ffa8006a2428779ae4a",
      countryCode: "0x69fb214a74d5253971a45b2d07f83f13ae96992dd38198d7bacb21e1f5fb5f81",
      languageCode: "0xac318126565a2fab608984a091b3582ba9cda6c32232f567eef50277c5042c36",
      genre: "0x01e58dbc76c15c9ac137dabac1823ebd6ef81efd563c5121000bc11c51a47cc7",
    },
    recordSales: {
      status: "available",
      recordPackageId:
        "0x75e5fa520c39322e0526ff56a495f9a2a88d097e2df7902d94e58a9a12831e76",
      recordShopPackageId:
        "0x2b97df3773040bb2cffd8c329bfd57f05f1fd2defb6ab156050ba1ae540d5d2a",
    },
    operations: {
      status: "available",
      vault: {
        packageId:
          "0xaed1aa729452c77f4c62882b73317851d628c30af55355c81eb1c93d3d3276ac",
        registryId:
          "0x5de3c379a15e4609260a94ace3d186cc466366fc6aebafe5663c016057b6a2d6",
      },
      actions: {
        compositionRoyaltyPool:
          "0x46b9b193255f28ec5190e8cd37ae85397c9110266da73a4a7a94fcb6e990155b",
        recordingRoyaltyPool:
          "0x78964bdc2dd7fad943633542edf5a1c9be38b1d2d25de1cc6cca64757c7d037a",
        partyWallet:
          "0x934f15715f725e3eed2acaeda5c717b6641dce4bb88b7670db26249cb6646728",
        compositionRoutedStake:
          "0xb1539001eaf32350d7044acb03092dcbd5a366e708d959aece0cca683f7f57fc",
        releaseRevenueDistributor:
          "0xd19dde6c20fa41092c9645e8300284cf1a268ab5ed3b3c7a2a12593672203b45",
      },
      plugins: {
        compositionRoyaltyPool:
          "0xad3525b86fad3f2aaaa3fdf0430d690efba249e378b1b89ed8180ecbc5d89392",
        recordingRoyaltyPool:
          "0x2adfc809152c5c8cf07f0e466d881b62d48c7da3ae2e787c0471deb867a6a385",
        releaseRevenueDistributor:
          "0x4f1da8c04ec53749f6cf6e8d2d48701fd72654078240050e20e41dc774f93d46",
      },
    },
    packages: {
      minato: "0xcdf58ed7e4580118a6a3f2a8077abffe633c551b2f19e95ce01685d42f90b8d9",
      credit: "0xc5a82310ce313af8f0ec18a4e564af11971b360db9e2ae686fef86fb2297a9a9",
      compositionCredits: "0xc58ac5d69740866f6514f68f2e9c86b1d069d819ad0bcf5384b6aaa66e0fbf53",
      recordingCredits: "0x7bafa653854f0820d911b8f6aa0aac3b131163c254b0021330881b77206d4d79",
      releaseCredits: "0x47ccd23c669b023b8678193e7748235916e16e737fdd8ba48b131ded29c76a00",
      royaltyPool: "0xecaa5a29cf8e110face3b80f0e4a5554e8c80edd8eda0983ed2f8015367eecca",
      routedStake: "0x30ed387d3fea69579ddb34d011fa6e1416580bfb3ee6587aabf103fb0d17bced",
      coverArt: "0x2b811f82d33cf6a9448adb11a598f6b04c14970cfc8e2982cde1d468e8e7d4a4",
      releaseCoverArt: "0x4f0a8736685f6b1ddbcd0bddcd7aae2d072aa3d4043efc0ad4042a7786068999",
      genre: "0x01e58dbc76c15c9ac137dabac1823ebd6ef81efd563c5121000bc11c51a47cc7",
      releaseDescription: "0x50f5acf7c0c05cdc7656072fd1bfc5ee76d02beabeae090103734b2d75118fa3",
      releaseDspLink: "0x9ca9ad8cab49c4897cd3cb89628b771ee4f10831ddc273036837751a5339d02a",
      releaseGenre: "0xfb73b04be2f72704ec5e6a1035bfab108e5ee2a72e72c0505f999291e23219bd",
      releaseKind: "0xfb2e5790f0577aca3ac8ddd672c4c58ef1e49ef1c3dfe14fb9676aaabf769169",
      recordingAdvisory: "0x23abf3f248466c08edc3349b202d6e809064c0e52098ff290cef1fdc51d5942e",
      recordingLanguage: "0xb3e1c578638a79acc7ab573c994206047ad8ef76893f9c5c987887c5b10a5c68",
      recordingMasterReference: "0x92a752854b80a6103721743125ee48223b577a023fe360e25d3aa695462a6d15",
      recordingEngineSession: "0xdd8f817a221e2acd5a4e6f34d0192d8e0dbddeb76c2dff2fdc82991cb4feb6c6",
      recordSealPolicy: "0xfa22d0678eaec39ad36b74c2c5439d574292e8fb19a9a15272733267499d5351",
      recordingPreview: "0x2be8405f6b77a30d6942cb240c0d804d608ef761395e6f861b71d9ae3c98f997",
      ori: "0xf35cf353a62cef01084b51a9cf3da4c64c8724685ad1862f2f8284b71bd26c1a",
    },
    objects: {
      releaseRegistry: "0x452c9904677a1bbf92d4e07d86d2c3eb038c47595b0e17a23756f03887eb2a2a",
      genreRegistry: "0xda4cc070da1a71d43387973027a7230587a1b9c829d37c2af4a3adbc15fdb8a8",
      recordGate: "0x8fd51c8b31bb6012fb03d2be39ed7b9f0f581329b6b338c60c209110cc659f31",
    },
    legacy: { releaseCoverArtPackages: [] },
  });

  const deployment = MISO_PLATFORM_DEPLOYMENTS.testnet;
  const identities = [
    deployment.chainIdentifier,
    ...Object.values(deployment.protocol),
    deployment.recordSales.recordPackageId,
    deployment.recordSales.recordShopPackageId,
    deployment.operations.vault.packageId,
    deployment.operations.vault.registryId,
    ...Object.values(deployment.operations.actions),
    ...Object.values(deployment.operations.plugins),
    ...Object.values(deployment.packages),
    ...Object.values(deployment.objects),
  ];
  expect(identities).toHaveLength(66);
});

test("bundled deployment and every nested container are frozen", () => {
  expectRecursivelyFrozen(MISO_PLATFORM_DEPLOYMENTS);
});

test("custom deployment registration snapshots nested targets before readiness", async () => {
  const custom = structuredClone(
    MISO_PLATFORM_DEPLOYMENTS.testnet,
  ) as Mutable<MisoPlatformDeployment>;
  const expected = structuredClone(custom);
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => ({ chainIdentifier: expected.chainIdentifier }),
  });
  const client = base.$extend(
    miso({ deployment: custom as MisoPlatformDeployment }),
  );

  expect(Object.isFrozen(custom)).toBeFalse();
  expect(Object.isFrozen(custom.operations)).toBeFalse();
  custom.chainIdentifier = "mutated-before-ready";
  custom.protocol.miso = id(701);
  if (custom.recordSales.status !== "available") throw new Error("test fixture");
  custom.recordSales.recordPackageId = id(702);
  custom.recordSales.recordShopPackageId = id(703);
  if (custom.operations.status !== "available") throw new Error("test fixture");
  custom.operations.vault.packageId = id(704);
  custom.operations.actions.partyWallet = id(705);
  custom.operations.plugins.compositionRoyaltyPool = id(706);
  custom.packages.minato = id(707);
  custom.objects.releaseRegistry = id(708);
  custom.legacy.releaseCoverArtPackages.push(id(709));

  await client.miso.ready();
  expect(client.miso.deployment).not.toBe(custom);
  expect(client.miso.deployment).toEqual(expected);
  expectRecursivelyFrozen(client.miso.deployment);
  expect(client.miso.recordPackageId).toBe(
    expected.recordSales.status === "available"
      ? expected.recordSales.recordPackageId
      : "",
  );

  const before = new Transaction();
  before.add(
    client.miso.call.partyWallet!.inboxAddress({
      arguments: [before.object(A)],
    }),
  );
  before.add(
    client.miso.protocol!.call.release.releaseRegistryId({ arguments: [A] }),
  );
  expect(moveCalls(before).map((call) => call.package)).toEqual([
    expected.operations.status === "available"
      ? expected.operations.actions.partyWallet
      : "",
    expected.protocol.miso,
  ]);

  custom.protocol.miso = id(710);
  custom.recordSales.recordPackageId = id(711);
  custom.operations.actions.partyWallet = id(712);
  custom.legacy.releaseCoverArtPackages.push(id(713));
  expect(client.miso.deployment).toEqual(expected);
  expect(client.miso.recordPackageId).toBe(
    expected.recordSales.status === "available"
      ? expected.recordSales.recordPackageId
      : "",
  );
  expect(() => {
    (client.miso.deployment as Mutable<MisoPlatformDeployment>).packages.minato =
      id(714);
  }).toThrow(TypeError);
});

test("deprecated custom config registration snapshots nested targets", async () => {
  const config = {
    network: "testnet",
    chainIdentifier: "custom-config-chain",
    misoPackageId: MISO,
    recordSales: {
      status: "available",
      recordPackageId: RECORD,
      recordShopPackageId: SHOP,
    },
    operations: structuredClone(OPERATIONS),
  } as Mutable<MisoPlatformConfig>;
  const expectedOperations = structuredClone(OPERATIONS);
  const base = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  });
  Object.defineProperty(base.core, "getChainIdentifier", {
    configurable: true,
    value: async () => ({ chainIdentifier: "custom-config-chain" }),
  });
  const client = base.$extend(misoPlatform(config));

  expect(Object.isFrozen(config)).toBeFalse();
  expect(Object.isFrozen(config.operations)).toBeFalse();
  config.chainIdentifier = "mutated-before-ready";
  if (config.recordSales?.status !== "available") throw new Error("test fixture");
  config.recordSales.recordPackageId = id(801);
  if (config.operations?.status !== "available") throw new Error("test fixture");
  config.operations.actions.partyWallet = id(802);
  await client.misoPlatform.ready();

  expect(client.misoPlatform.recordPackageId).toBe(RECORD);
  const tx = new Transaction();
  tx.add(
    client.misoPlatform.call.partyWallet!.inboxAddress({
      arguments: [tx.object(A)],
    }),
  );
  expect(moveCalls(tx)[0]?.package).toBe(
    expectedOperations.actions.partyWallet,
  );

  config.recordSales.recordPackageId = id(803);
  config.operations.actions.partyWallet = id(804);
  expect(client.misoPlatform.recordPackageId).toBe(RECORD);
  const after = new Transaction();
  after.add(
    client.misoPlatform.call.partyWallet!.inboxAddress({
      arguments: [after.object(A)],
    }),
  );
  expect(moveCalls(after)[0]?.package).toBe(
    expectedOperations.actions.partyWallet,
  );
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
