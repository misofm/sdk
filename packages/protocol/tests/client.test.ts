// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { miso } from "../src/client.ts";
import * as contracts from "../src/contracts.ts";
import {
  assertMisoDeployment,
  getMisoDeployment,
  getMisoProtocolDeployment,
  MISO_DEPLOYMENTS,
  MISO_PACKAGE_NAMES,
  type MisoDeployment,
} from "../src/deployments.ts";

const MISO = "0x" + "cd".repeat(32);
const SHARE = "0x" + "ab".repeat(32) + "::share::Share";
const A = "0x" + "11".repeat(32);

const FULL_DEPLOYMENT = Object.fromEntries(
  MISO_PACKAGE_NAMES.map((name, index) => [
    name,
    name === "miso"
      ? MISO
      : `0x${(index + 1).toString(16).padStart(64, "0")}`,
  ]),
) as MisoDeployment;

const VERIFIED_TESTNET_DEPLOYMENT = {
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
} as const satisfies MisoDeployment;

function coreClient() {
  return new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso({ misoPackageId: MISO }));
}

interface Call {
  package?: string;
  module: string;
  function: string;
}

function moveCalls(tx: Transaction): Call[] {
  const data = tx.getData() as {
    commands: { $kind: string; MoveCall?: Call }[];
  };
  return data.commands
    .filter((command) => command.$kind === "MoveCall" && command.MoveCall)
    .map((command) => command.MoveCall!);
}

test("client.call binds an explicit core package, never the codegen source label", () => {
  const tx = new Transaction();
  coreClient().miso.call.composition._new({
    typeArguments: [SHARE],
    arguments: [
      tx.pure.string("x"),
      tx.pure.u16(1000),
      tx.object(A),
      tx.object(A),
    ],
  })(tx);

  expect(moveCalls(tx).find((call) => call.module === "composition")?.package).toBe(MISO);
});

test("a complete manifest binds extension calls to their own fresh package IDs", () => {
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso({ deployment: FULL_DEPLOYMENT }));
  const tx = new Transaction();

  client.miso.packages.call.extensions.recordingAdvisory.unsetRating({
    typeArguments: [SHARE, SHARE],
    arguments: [tx.object(A), tx.object(A)],
  })(tx);
  client.miso.packages.call.primitives.royaltyPool.pool.sweepAndDeposit({
    typeArguments: [SHARE, "0x2::sui::SUI"],
    arguments: [tx.object(A)],
  })(tx);

  const call = moveCalls(tx).find((item) => item.module === "recording_advisory");
  expect(call).toMatchObject({
    package: FULL_DEPLOYMENT.recordingAdvisory,
    function: "unset_rating",
  });
  expect(moveCalls(tx).find((item) => item.function === "sweep_and_deposit")).toMatchObject({
    package: FULL_DEPLOYMENT.royaltyPool,
    module: "pool",
  });
});

test("Party APIs live at client.miso.party and bind the consolidated manifest", () => {
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso({ deployment: FULL_DEPLOYMENT }));
  const tx = new Transaction();

  tx.add(client.miso.party.tx.setName({ partyId: A, capId: A, name: "Miso" }));

  expect(moveCalls(tx).find((item) => item.module === "party")).toMatchObject({
    package: FULL_DEPLOYMENT.misoParty,
    function: "set_name",
  });
  expect(client.miso.party.genrePackageId).toBe(FULL_DEPLOYMENT.genre);
  expect("uid" in client.miso.party.call.party).toBeFalse();
  expect("profile" in client.miso.party.call.profile).toBeFalse();
});

test("package-bound calls omit reference-returning Move views", () => {
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso({ deployment: FULL_DEPLOYMENT }));

  expect("title" in client.miso.packages.call.core.composition).toBeFalse();
  expect("releaseLink" in client.miso.packages.call.extensions.releaseDspLink).toBeTrue();
  expect("credits" in client.miso.packages.call.extensions.compositionCredits.compositionCredits).toBeFalse();
  expect("register" in client.miso.packages.call.primitives.routedStake).toBeFalse();
  expect("unregister" in client.miso.packages.call.primitives.routedStake).toBeFalse();
  expect("unstake" in client.miso.packages.call.primitives.routedStake).toBeFalse();
  expect("restake" in client.miso.packages.call.primitives.routedStake).toBeFalse();
});

test("package BCS projection exposes codecs only, not transaction builders", () => {
  const client = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" })
    .$extend(miso({ deployment: FULL_DEPLOYMENT }));
  const codecs = client.miso.packages.bcs;

  expect("Composition" in codecs.core.composition).toBeTrue();
  expect("_new" in codecs.core.composition).toBeFalse();
  expect("publish" in codecs.core.composition).toBeFalse();
  expect("package" in codecs.core.composition).toBeFalse();
  if (false) {
    // @ts-expect-error BCS namespaces must never expose a Move-call builder.
    codecs.core.composition._new;
  }
});

test("Testnet defaults to the bundled manifest while partial and unbundled deployments fail closed", () => {
  const client = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso());
  expect(client.miso.deployment.packageId).toBe(MISO_DEPLOYMENTS.testnet.miso);
  expect(client.miso.packages.deployment).toEqual(MISO_DEPLOYMENTS.testnet);
  expect(client.miso.party.genrePackageId).toBe(MISO_DEPLOYMENTS.testnet.genre);
  expect(getMisoDeployment("testnet")).toEqual(MISO_DEPLOYMENTS.testnet);
  expect(getMisoProtocolDeployment("testnet")).toEqual({
    packageId: MISO_DEPLOYMENTS.testnet.miso,
  });
  expect(() => getMisoProtocolDeployment("mainnet")).toThrow(
    /no verified Miso deployment/,
  );
  expect(() => assertMisoDeployment({ miso: MISO })).toThrow(
    /exactly these package IDs/,
  );
  expect(() =>
    new SuiGrpcClient({
      network: "testnet",
      baseUrl: "https://fullnode.testnet.sui.io:443",
    }).$extend(miso({ deployment: { miso: MISO } as MisoDeployment })),
  ).toThrow(/exactly these package IDs/);
  expect(() => coreClient().miso.packages).toThrow(/complete MisoDeployment/);
  expect(() => coreClient().miso.party).toThrow(/Party APIs require a complete MisoDeployment/);
});

test("Testnet deployment export matches the verified immutable admin-cli publish record", () => {
  expect(MISO_DEPLOYMENTS.testnet).toEqual(VERIFIED_TESTNET_DEPLOYMENT);
  expect(getMisoDeployment("testnet")).toEqual(VERIFIED_TESTNET_DEPLOYMENT);
  expect(getMisoProtocolDeployment("testnet")).toEqual({
    packageId: VERIFIED_TESTNET_DEPLOYMENT.miso,
  });
});

test("deployment manifests are exact, normalized, and snapshotted", () => {
  expect(() => assertMisoDeployment({ ...FULL_DEPLOYMENT, unexpected: MISO })).toThrow(
    /exactly these package IDs/,
  );
  expect(() => assertMisoDeployment({ ...FULL_DEPLOYMENT, miso: "0xAB" })).toThrow(
    /normalized|valid Sui address/,
  );
  expect(() =>
    assertMisoDeployment({ ...FULL_DEPLOYMENT, recordingAdvisory: MISO }),
  ).toThrow(/duplicates another package/);
  const mutable = { ...FULL_DEPLOYMENT };
  const client = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" })
    .$extend(miso({ deployment: mutable }));
  mutable.miso = "0x" + "ef".repeat(32);
  const tx = new Transaction();
  client.miso.call.release.releaseRegistryId({ arguments: [tx.object(A)] })(tx);
  expect(moveCalls(tx)[0]?.package).toBe(MISO);
});

test("bundled deployment defaults are runtime immutable", () => {
  const bundledMiso = VERIFIED_TESTNET_DEPLOYMENT.miso;
  const alternate = "0x" + "ef".repeat(32);
  const mutableRoot = MISO_DEPLOYMENTS as unknown as {
    testnet: MisoDeployment;
  };
  const mutableTestnet = MISO_DEPLOYMENTS.testnet as unknown as {
    miso: string;
  };

  expect(Object.isFrozen(MISO_DEPLOYMENTS)).toBeTrue();
  expect(Object.isFrozen(MISO_DEPLOYMENTS.testnet)).toBeTrue();
  expect(() => {
    mutableRoot.testnet = { ...FULL_DEPLOYMENT, miso: alternate };
  }).toThrow(TypeError);
  expect(() => {
    mutableTestnet.miso = alternate;
  }).toThrow(TypeError);

  expect(MISO_DEPLOYMENTS.testnet.miso).toBe(bundledMiso);
  expect(getMisoDeployment("testnet")).toEqual(MISO_DEPLOYMENTS.testnet);
  expect(getMisoProtocolDeployment("testnet")).toEqual({
    packageId: bundledMiso,
  });
});

test("core deployment is snapshotted and immutable at registration", () => {
  const alternate = "0x" + "ef".repeat(32);
  const supplied = { packageId: MISO };
  const client = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" })
    .$extend(miso({ deployment: supplied }));
  supplied.packageId = alternate;

  expect(client.miso.deployment.packageId).toBe(MISO);
  expect(Object.isFrozen(client.miso.deployment)).toBeTrue();
  expect(() => Object.assign(client.miso.deployment, { packageId: alternate })).toThrow();
  const tx = new Transaction();
  client.miso.call.release.releaseRegistryId({ arguments: [tx.object(A)] })(tx);
  expect(moveCalls(tx)[0]?.package).toBe(MISO);
});

test("exported package names are immutable and cannot weaken validation", () => {
  const names = MISO_PACKAGE_NAMES as unknown as string[];
  expect(Object.isFrozen(names)).toBeTrue();
  expect(() => names.pop()).toThrow();
  expect(() => names.splice(0, 1)).toThrow();
  expect(() => assertMisoDeployment(FULL_DEPLOYMENT)).not.toThrow();
});

test("bound package IDs cannot be overridden by callers", () => {
  const client = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" })
    .$extend(miso({ deployment: FULL_DEPLOYMENT }));
  const tx = new Transaction();
  client.miso.packages.call.core.release.releaseRegistryId({
    // @ts-expect-error Bound package call options intentionally omit package.
    package: "0x" + "ef".repeat(32),
    arguments: [tx.object(A)],
  })(tx);
  expect(moveCalls(tx)[0]?.package).toBe(MISO);
});

test("public contracts retain BCS but omit unsafe reference-returning calls", () => {
  expect("Composition" in contracts.composition).toBeTrue();
  expect("uid" in contracts.composition).toBeFalse();
  expect("uidMut" in contracts.release).toBeFalse();
  expect("credits" in contracts.compositionCredits).toBeFalse();
  expect("_new" in contracts.royaltyPool).toBeFalse();
  expect("_new" in contracts.routedStake).toBeFalse();
  expect("register" in contracts.routedStake).toBeFalse();
  expect("unregister" in contracts.routedStake).toBeFalse();
  expect("unstake" in contracts.routedStake).toBeFalse();
  expect("restake" in contracts.routedStake).toBeFalse();
  if (false) {
    // @ts-expect-error UID-gated routed-stake transitions are not client calls.
    contracts.routedStake.register;
  }
});
