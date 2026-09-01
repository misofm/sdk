// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
  MisoDeployment,
  MisoNetwork,
} from "@misonetwork/sdk/deployments";
import { MISO_DEPLOYMENTS } from "@misonetwork/sdk/deployments";

/** Complete on-chain identity used by the Miso platform SDK on one network. */
export interface MisoPlatformDeployment {
  /** Network name this immutable deployment set belongs to. */
  readonly network: MisoNetwork;
  /** Full ledger genesis digest used to reject a mislabeled RPC endpoint. */
  readonly chainIdentifier: string;
  /** The complete protocol and Party deployment this platform build targets. */
  readonly protocol: MisoDeployment;
  readonly packages: {
    readonly pressing: string;
    readonly record: string;
    readonly minato: string;
    readonly credit: string;
    readonly compositionCredits: string;
    readonly recordingCredits: string;
    readonly releaseCredits: string;
    /** Base royalty-pool value library. */
    readonly royaltyPool: string;
    /** Shared custody package for protocol admin capabilities. */
    readonly vault: string;
    /** Vault plugin that creates and cranks Composition royalty pools. */
    readonly vaultCompositionRoyaltyPoolPlugin: string;
    /** Vault plugin that creates and cranks Recording royalty pools. */
    readonly vaultRecordingRoyaltyPoolPlugin: string;
    /** Vault plugin that manages a Party's royalty-bearing wallet. */
    readonly vaultPartyWalletPlugin: string;
    /** Generic stake wrapper used by the composition routed-stake plugin. */
    readonly routedStake: string;
    /** Vault plugin for Composition-owned Recording-share staking. */
    readonly vaultCompositionRoutedStakePlugin: string;
    /** Cover-art value type used by the release cover extension. */
    readonly coverArt: string;
    readonly releaseCoverArt: string;
    /** Curated Genre vocabulary package used by release_genre. */
    readonly genre: string;
    readonly releaseDescription: string;
    readonly releaseDspLink: string;
    readonly releaseGenre: string;
    readonly releaseKind: string;
    /** Vault plugin that routes Release revenue into Recording addresses. */
    readonly vaultReleaseRevenueDistributorPlugin: string;
    readonly recordingAdvisory: string;
    readonly recordingLanguage: string;
    readonly recordingMasterReference: string;
    /** Canonical plaintext session pointer extension; absent before publication. */
    readonly recordingEngineSession?: string;
    /** Original immutable Record-gated Seal policy; absent before publication. */
    readonly recordSealPolicy?: string;
    readonly recordingPreview: string;
    /** External `ori::walrus_data::WalrusData` dependency used by cover art. */
    readonly ori: string;
  };
  readonly objects: {
    readonly releaseRegistry: string;
    /** Shared parent used to derive canonical Vault object ids. */
    readonly vaultRegistry: string;
    /** Shared parent used to derive canonical Genre object ids. */
    readonly genreRegistry: string;
    /**
     * Singleton namespace and per-release sequence allocator for Records.
     * Absent from deployment generations published before RecordRegistry.
     */
    readonly recordRegistry?: string;
    /**
     * Shared single-witness policy used by the concrete Record package. Absent from
     * legacy deployment generations; purchase callers must then supply the
     * Settings ID from a newer verified deployment explicitly.
     */
    readonly recordSettings?: string;
    /** Frozen namespace object embedded in Recording-session Seal identities. */
    readonly recordGate?: string;
  };
  readonly legacy: {
    readonly releaseCoverArtPackages: readonly string[];
  };
}

/**
 * Platform deployments bundled with this SDK release.
 *
 * IDs come only from verified immutable deployment output.
 * Consumers may still pass an explicit complete deployment for custom networks.
 */
export const MISO_PLATFORM_DEPLOYMENTS = {
  testnet: {
    network: "testnet",
    chainIdentifier: "69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD",
    protocol: MISO_DEPLOYMENTS.testnet,
    packages: {
      pressing: "0x95fba53c968978f75d6ca8a5e6f0f3ba83fdc3af301bc8419be354a3990af5b9",
      record: "0x6150c474200f63bf73072642564886e5ecb1a4c0498ede31acd7908d94dbc83b",
      minato: "0x8466e9864c1d947888e73b0e349b035bc22805579eef18f132966f56c8efe1d2",
      credit: "0x20d8e38f49445cbae45fd66c262c2cbc4bf4cccab487b3fb443a491dc24071cd",
      compositionCredits: "0x8b376967e9c32169727ec5341890f28c66d8577d7bfcecb83aa78aec3e84dce5",
      recordingCredits: "0x7096a47b0ba12063c037d6d417bffade758665a3f313574c8ba218823cfb159a",
      releaseCredits: "0xbe293700ef758c95b69838df6cfa8377b9cad1dd59cbf933974f68b1766d87b5",
      royaltyPool: "0x8021942b5e91c5ef5e383ad481102ee96f52dd77b9b3dbcdf06bb133cd7c91ed",
      vault: "0xfe396139d500e4381adefea72da2e0157c54ee5c38cc8bdcbc4edd551d043230",
      vaultCompositionRoyaltyPoolPlugin: "0xbfd9b6c9d3e5635c0beb5472b45566b92f509ed67ae4a661bf928c359f3b438f",
      vaultRecordingRoyaltyPoolPlugin: "0x1643c188790a7e756310ce779b279159356a9bf7fe8237edf1e5b24a15422615",
      vaultPartyWalletPlugin: "0x0d869fe4291fec02821aed40c38349bac8547f0c690316f2a1a2273ac1f317ed",
      routedStake: "0x7a55b1841043efea865d65a6601e057400a79a0aa7bb11e781a25dbe622cbe5f",
      vaultCompositionRoutedStakePlugin: "0xf86994ebd0dabecda1b14efc02a2e71b3219a7c043841ad8097dc3683bd088dd",
      coverArt: "0x2dae28058b89df93224bacfb9af42fd3ab41f001c2c815fd57fd575024d9a50b",
      releaseCoverArt: "0x649b18f2bb3d94f6a611a8e4ad3a29dcf8b7bba3f684056d60897a8a5e835106",
      genre: "0x5091d30e893105abe24adf75223f587361034e90516c6e509897bb86d18d2387",
      releaseDescription: "0x3e26e4c4c5b3f51070d6d7bb1527eaa304f34ae5dfde078661e180e7594d6d28",
      releaseDspLink: "0x2b8e1d7be7a3cbc07e6167c5b5c6511059791b4a2116c1fa97d65cfd871d0bda",
      releaseGenre: "0x7882367d45efff41ef0cb9e937029a3f8a3cdf5908d83beeb5cbc0cff178d290",
      releaseKind: "0x3e74c960d9446ae2ebf228456ddc1b099d2090501c9cbcd284a999aa2e774e12",
      vaultReleaseRevenueDistributorPlugin: "0x2172dc326fbf226b6cf6eed610f217fb0ff2682d1938e8089f4d6ce21a4999b5",
      recordingAdvisory: "0x28e0e72c5b892fc888a9007afa59ebe04ed8e47f12632ddb42cd685d09c4af2e",
      recordingLanguage: "0x4b284a9435cf4f48e3785e4485d16be2fcbcef5beaa2b44b6556d9c1028e2c0d",
      recordingMasterReference: "0x2b06ab58f2d5a915b42fc5879d52241fc72e804b3da782fa752b2d2f242170c0",
      recordingPreview: "0x449aafe29707adf249df7e90355ecb19d939ea77d9e19fd3e2fdb220e73e74f0",
      ori: "0x340057f2174fb59e4626742dd2b46c662237837b6187450cb59e4976ce7eac78",
    },
    objects: {
      releaseRegistry: "0xf5941ae9640f6f24b75e921da16c95fd23d776b9e6518c275a50a5ce6337c8ba",
      vaultRegistry: "0xee17744a0c6f71bbde98d0c2b4cab58929000fd2f65e28a4676164d34758584b",
      genreRegistry: "0xa83f9c7a340b5b5b6387d1d5933019b45bcedebbae85bbb89bab855a56e90816",
    },
    legacy: {
      releaseCoverArtPackages: [],
    },
  },
} as const satisfies Partial<
  Record<MisoNetwork, MisoPlatformDeployment>
>;

/** Resolve a bundled platform deployment, failing closed when it is unavailable. */
export function getMisoPlatformDeployment(
  network: string,
): MisoPlatformDeployment {
  const deployment = (
    MISO_PLATFORM_DEPLOYMENTS as Partial<Record<string, MisoPlatformDeployment>>
  )[network];
  if (!deployment) {
    throw new Error(
      `@misofm/sdk: no bundled Miso platform deployment for network "${network}". ` +
        "Pass an explicit deployment to miso() for custom networks.",
    );
  }
  return deployment;
}
