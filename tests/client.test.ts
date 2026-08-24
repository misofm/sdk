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
import {
  getMisoPlatformDeployment,
  MISO_PLATFORM_DEPLOYMENTS,
  type MisoPlatformDeployment,
} from "../src/deployments.ts";
import {
  MISO_PACKAGE_NAMES,
  type MisoDeployment,
} from "@misonetwork/sdk/deployments";
import { networkFrom } from "../src/read/config.ts";

const PRESSING = "0x" + "12".repeat(32);
const MISO = "0x" + "cd".repeat(32);
const MINATO = "0x" + "ef".repeat(32);
const SHARE = "0x" + "ab".repeat(32) + "::share::Share";
const A = "0x" + "11".repeat(32);
const VAULT = "0x" + "56".repeat(32);

/** Addresses are injected only after the admin-cli deployment is verified. */
const NETWORK_DEPLOYMENT = Object.fromEntries(
  MISO_PACKAGE_NAMES.map((name, index) => [
    name,
    name === "miso"
      ? MISO
      : `0x${(index + 1).toString(16).padStart(64, "0")}`,
  ]),
) as MisoDeployment;

const DEPLOYMENT = {
  network: "testnet",
  chainIdentifier: "testnet-chain-identifier",
  protocol: NETWORK_DEPLOYMENT,
  packages: {
    pressing: PRESSING,
    minato: MINATO,
    releaseCoverArt: A,
    releaseCredits: A,
    vault: VAULT,
    compositionRoyaltyPoolPlugin: A,
    recordingRoyaltyPoolPlugin: A,
    partyWalletPlugin: A,
    compositionRoutedStakePlugin: A,
    routedStake: A,
    releaseRevenueDistributorPlugin: A,
  },
  objects: { releaseRegistry: A, genreRegistry: A },
} as unknown as MisoPlatformDeployment;

function client() {
  return new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(
    misoPlatform({
      packageId: PRESSING,
      misoPackageId: MISO,
      minatoPackageId: MINATO,
      releaseRegistryId: A,
    }),
  );
}

test("pressing-only misoPlatform configuration does not register the fail-closed protocol extension", () => {
  const c = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" })
    .$extend(misoPlatform({ packageId: PRESSING }));
  expect(c.misoPlatform.packageId).toBe(PRESSING);
  expect(c.misoPlatform.protocol).toBeUndefined();
});

test("miso() accepts an explicit verified deployment and exposes nested protocol", () => {
  const c = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso({ deployment: DEPLOYMENT }));

  expect(c.miso.packageId).toBe(PRESSING);
  expect(c.miso.protocol.deployment).toEqual({ packageId: MISO });
  expect(c.miso.party).toBe(c.miso.protocol.party);

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
  expect(calls.find((call) => call.module === "composition")?.package).toBe(MISO);
  expect(calls.find((call) => call.module === "minato")?.package).toBe(MINATO);
});

test("miso() selects the bundled Testnet deployment and unbundled networks fail closed", () => {
  const c = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso());
  expect(c.miso.packageId).toBe(MISO_PLATFORM_DEPLOYMENTS.testnet.packages.pressing);
  expect(c.miso.protocol.deployment.packageId).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.protocol.miso,
  );
  expect(c.miso.party.genrePackageId).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet.protocol.genre,
  );
  expect(getMisoPlatformDeployment("testnet")).toBe(
    MISO_PLATFORM_DEPLOYMENTS.testnet,
  );
  expect(() => getMisoPlatformDeployment("mainnet")).toThrow(
    /no bundled Miso platform deployment/,
  );
});

test("network parsing defaults only missing values and rejects typos", () => {
  expect(networkFrom(undefined)).toBe("testnet");
  expect(networkFrom("testnet")).toBe("testnet");
  expect(networkFrom("mainnet")).toBe("mainnet");
  expect(() => networkFrom("tesnet")).toThrow(/unsupported network/);
});

test("miso() binds generated platform and vault calls to an explicit deployment", () => {
  const c = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso({ deployment: DEPLOYMENT }));
  const tx = new Transaction();
  c.miso.call.pressing.newActiveState({})(tx);
  expect(
    moveCalls(tx).find(
      (call) =>
        call.module === "pressing" && call.function === "new_active_state",
    )?.package,
  ).toBe(PRESSING);

  // The public type omits `package`; even an untyped caller cannot replace it.
  const forcedPackage = c.miso.call.pressing.newActiveState as unknown as (
    options: { package: string },
  ) => (tx: Transaction) => unknown;
  forcedPackage({ package: A })(tx);
  expect(
    moveCalls(tx)
      .filter(
        (call) =>
          call.module === "pressing" && call.function === "new_active_state",
      )
      .at(-1)?.package,
  ).toBe(PRESSING);

  c.miso.call.vault.vaultId({ arguments: [tx.object(A)] })(tx);
  expect(
    moveCalls(tx).find(
      (call) => call.module === "vault" && call.function === "vault_id",
    )?.package,
  ).toBe(VAULT);

  c.miso.call.partyWallet.isInstalled({ arguments: [tx.object(A)] })(tx);
  expect(
    moveCalls(tx).find(
      (call) => call.module === "party_wallet" && call.function === "is_installed",
    )?.package,
  ).toBe(A);

  c.miso.call.releaseCoverArt.hasCoverArt({
    arguments: [tx.object(A)],
  })(tx);
  expect(
    moveCalls(tx).find(
      (call) =>
        call.module === "release_cover_art" &&
        call.function === "has_cover_art",
    )?.package,
  ).toBe(A);

  c.miso.call.releaseCredits.hasCredits({ arguments: [tx.object(A)] })(tx);
  expect(
    moveCalls(tx).find(
      (call) =>
        call.module === "release_credits" && call.function === "has_credits",
    )?.package,
  ).toBe(A);

  c.miso.call.vault.vaultId({
    typeArguments: [SHARE],
    arguments: [tx.object(A)],
  })(tx);
  expect(
    moveCalls(tx).find(
      (call) => call.module === "vault" && call.function === "vault_id",
    )?.package,
  ).toBe(VAULT);
});

test("miso() binds whole-release graph package ids", () => {
  const c = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(miso({ deployment: DEPLOYMENT }));
  const tx = new Transaction();
  c.miso.tx.publishReleaseGraph({
    compositions: [],
    recordings: [],
    release: {
      title: "R",
      nonce: "1",
      adminAddress: A,
      releaseRegistryId: A,
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
  expect(calls.find((call) => call.module === "release")?.package).toBe(MISO);
  expect(
    calls.find((call) => call.module === "release" && call.function === "new")?.package,
  ).toBe(MISO);
});

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
    .filter((c) => c.$kind === "MoveCall" && c.MoveCall)
    .map((c) => c.MoveCall!);
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
  const compNew = calls.find(
    (c) => c.module === "composition" && c.function === "new",
  );
  expect(compNew?.package).toBe(MISO); // miso bound
  const disperse = calls.find(
    (c) => c.module === "minato" && c.function === "disperse_balance",
  );
  expect(disperse?.package).toBe(MINATO); // minato bound
});

test("client without misoPackageId/minatoPackageId throws on publish builders, not on pressing builders", () => {
  const sellOnly = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(misoPlatform({ packageId: PRESSING }));

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

  const withoutMiso = new SuiGrpcClient({
    network: "testnet",
    baseUrl: "https://fullnode.testnet.sui.io:443",
  }).$extend(
    misoPlatform({
      packageId: PRESSING,
      releaseRegistryId: A,
    }),
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
  expect(
    moveCalls(tx).find((c) => c.module === "pressing" && c.function === "new")
      ?.package,
  ).toBe(PRESSING);
});

test("client.misoPlatform.tx.publishRelease binds the core registry object", () => {
  const tx = new Transaction();
  client().misoPlatform.tx.publishRelease({
    title: "LP",
    tracks: [
      {
        recordingId: A,
        recordingAdminCapId: A,
        recordingShareType: SHARE,
        compositionShareType: SHARE,
        splitBps: 10000,
      },
    ],
    releaseId: A,
    releaseNonce: "0",
    adminAddress: A,
  })(tx);

  const registry = moveCalls(tx).find(
    (call) =>
      call.module === "release" && call.function === "new",
  );
  expect(registry?.package).toBe(MISO);
});
