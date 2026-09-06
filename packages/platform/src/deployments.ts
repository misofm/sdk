// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MisoDeployment, MisoNetwork } from "@misofm/protocol/deployments";
import { MISO_DEPLOYMENTS } from "@misofm/protocol/deployments";
import { normalizeSuiObjectId } from "@mysten/sui/utils";
import { immutableSnapshot } from "./internal.ts";

/** Primary Record sales are unavailable on legacy deployments until both new
 * immutable packages have been freshly published and verified. */
export type RecordSalesDeployment =
  | {
      readonly status: "unavailable";
      readonly reason: string;
      readonly legacy?: {
        readonly recordPackageId: string;
        readonly pressingPackageId: string;
      };
    }
  | {
      readonly status: "available";
      readonly recordPackageId: string;
      readonly recordShopPackageId: string;
    };

export class RecordSalesUnavailableError extends Error {
  override readonly name = "RecordSalesUnavailableError";
  constructor(readonly reason: string) {
    super(`@misofm/platform: Record sales are unavailable: ${reason}`);
  }
}

export function requireRecordSalesDeployment(
  deployment: RecordSalesDeployment | undefined,
): Extract<RecordSalesDeployment, { status: "available" }> {
  if (!deployment || deployment.status === "unavailable") {
    throw new RecordSalesUnavailableError(
      deployment?.reason ?? "no Record sales deployment was configured",
    );
  }
  const canonicalPackageId = (value: string): boolean => {
    if (!/^0x[0-9a-f]{64}$/.test(value)) return false;
    try {
      return normalizeSuiObjectId(value) === value;
    } catch {
      return false;
    }
  };
  if (
    !canonicalPackageId(deployment.recordPackageId) ||
    !canonicalPackageId(deployment.recordShopPackageId)
  ) {
    throw new RecordSalesUnavailableError(
      "Record and Record Shop package IDs must be canonical 32-byte Sui object IDs",
    );
  }
  if (deployment.recordPackageId === deployment.recordShopPackageId) {
    throw new RecordSalesUnavailableError(
      "Record and Record Shop package IDs must be distinct",
    );
  }
  return deployment;
}

/** Vault custody and the exact Action/plugin ABI deployed alongside it. */
export type OperationsDeployment =
  | {
      readonly status: "unavailable";
      readonly reason: string;
      /** Historical identities are metadata only and are never executable ABIs. */
      readonly legacy?: {
        readonly vaultPackageId?: string;
        readonly vaultRegistryId?: string;
        readonly packageIds?: Readonly<Record<string, string>>;
      };
    }
  | {
      readonly status: "available";
      readonly vault: {
        readonly packageId: string;
        readonly registryId: string;
      };
      readonly actions: {
        readonly compositionRoyaltyPool: string;
        readonly recordingRoyaltyPool: string;
        readonly partyWallet: string;
        readonly compositionRoutedStake: string;
        readonly releaseRevenueDistributor: string;
      };
      readonly plugins: {
        readonly compositionRoyaltyPool: string;
        readonly recordingRoyaltyPool: string;
        readonly releaseRevenueDistributor: string;
      };
    };

export class OperationsUnavailableError extends Error {
  override readonly name = "OperationsUnavailableError";
  constructor(readonly reason: string) {
    super(`@misofm/platform: Vault operations are unavailable: ${reason}`);
  }
}

export type AvailableOperationsDeployment = Extract<
  OperationsDeployment,
  { status: "available" }
>;

function canonicalObjectId(value: unknown): value is string {
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/.test(value)) {
    return false;
  }
  try {
    return normalizeSuiObjectId(value) === value;
  } catch {
    return false;
  }
}

/**
 * Require one complete, non-aliased operations deployment.
 *
 * This validates only a complete canonical, pairwise-distinct structural set.
 * It cannot establish provenance for arbitrary caller-supplied custom IDs; the
 * caller owns that provenance. The bundled frozen map below is generated from
 * one verified immutable admin export.
 */
export function requireOperationsDeployment(
  deployment: OperationsDeployment | undefined,
): AvailableOperationsDeployment {
  if (!deployment || deployment.status !== "available") {
    throw new OperationsUnavailableError(
      deployment?.reason ?? "no Vault operations deployment was configured",
    );
  }

  const candidate = deployment as Partial<AvailableOperationsDeployment>;
  const vault = candidate.vault as
    | Partial<AvailableOperationsDeployment["vault"]>
    | undefined;
  const actions = candidate.actions as
    | Partial<AvailableOperationsDeployment["actions"]>
    | undefined;
  const plugins = candidate.plugins as
    | Partial<AvailableOperationsDeployment["plugins"]>
    | undefined;
  const packageEntries = [
    ["vault.packageId", vault?.packageId],
    ["actions.compositionRoyaltyPool", actions?.compositionRoyaltyPool],
    ["actions.recordingRoyaltyPool", actions?.recordingRoyaltyPool],
    ["actions.partyWallet", actions?.partyWallet],
    ["actions.compositionRoutedStake", actions?.compositionRoutedStake],
    ["actions.releaseRevenueDistributor", actions?.releaseRevenueDistributor],
    ["plugins.compositionRoyaltyPool", plugins?.compositionRoyaltyPool],
    ["plugins.recordingRoyaltyPool", plugins?.recordingRoyaltyPool],
    ["plugins.releaseRevenueDistributor", plugins?.releaseRevenueDistributor],
  ] as const;

  for (const [field, id] of packageEntries) {
    if (!canonicalObjectId(id)) {
      throw new OperationsUnavailableError(
        `${field} must be a canonical 32-byte Sui package ID`,
      );
    }
  }
  if (!canonicalObjectId(vault?.registryId)) {
    throw new OperationsUnavailableError(
      "vault.registryId must be a canonical 32-byte Sui object ID",
    );
  }

  const identities = [
    ...packageEntries.map(([, id]) => id as string),
    vault.registryId,
  ];
  if (new Set(identities).size !== identities.length) {
    throw new OperationsUnavailableError(
      "the Vault registry object and all nine package IDs must be distinct",
    );
  }
  return deployment;
}

/** Complete on-chain identity used by the Miso platform SDK on one network. */
export interface MisoPlatformDeployment {
  /** Network name this immutable deployment set belongs to. */
  readonly network: MisoNetwork;
  /** Full ledger genesis digest used to reject a mislabeled RPC endpoint. */
  readonly chainIdentifier: string;
  /** The complete protocol and Party deployment this platform build targets. */
  readonly protocol: MisoDeployment;
  readonly recordSales: RecordSalesDeployment;
  /** Fail-closed, structurally complete Vault/Action/plugin identity set. */
  readonly operations: OperationsDeployment;
  readonly packages: {
    readonly minato: string;
    readonly credit: string;
    readonly compositionCredits: string;
    readonly recordingCredits: string;
    readonly releaseCredits: string;
    /** Base royalty-pool value library. */
    readonly royaltyPool: string;
    /** Generic stake wrapper used by composition routed-stake operations. */
    readonly routedStake: string;
    /** Cover-art value type used by the release cover extension. */
    readonly coverArt: string;
    readonly releaseCoverArt: string;
    /** Curated Genre vocabulary package used by release_genre. */
    readonly genre: string;
    readonly releaseDescription: string;
    readonly releaseDspLink: string;
    readonly releaseGenre: string;
    readonly releaseKind: string;
    readonly recordingAdvisory: string;
    readonly recordingLanguage: string;
    readonly recordingMasterReference: string;
    /** Complete Walrus Quilt containing the Recording's streaming transcodes. */
    readonly recordingStreamingTranscode?: string;
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
    /** Shared parent used to derive canonical Genre object ids. */
    readonly genreRegistry: string;
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
export const MISO_PLATFORM_DEPLOYMENTS = immutableSnapshot({
  testnet: {
    network: "testnet",
    chainIdentifier: "69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD",
    protocol: MISO_DEPLOYMENTS.testnet,
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
      minato:
        "0xcdf58ed7e4580118a6a3f2a8077abffe633c551b2f19e95ce01685d42f90b8d9",
      credit:
        "0xc5a82310ce313af8f0ec18a4e564af11971b360db9e2ae686fef86fb2297a9a9",
      compositionCredits:
        "0xc58ac5d69740866f6514f68f2e9c86b1d069d819ad0bcf5384b6aaa66e0fbf53",
      recordingCredits:
        "0x7bafa653854f0820d911b8f6aa0aac3b131163c254b0021330881b77206d4d79",
      releaseCredits:
        "0x47ccd23c669b023b8678193e7748235916e16e737fdd8ba48b131ded29c76a00",
      royaltyPool:
        "0xecaa5a29cf8e110face3b80f0e4a5554e8c80edd8eda0983ed2f8015367eecca",
      routedStake:
        "0x30ed387d3fea69579ddb34d011fa6e1416580bfb3ee6587aabf103fb0d17bced",
      coverArt:
        "0x2b811f82d33cf6a9448adb11a598f6b04c14970cfc8e2982cde1d468e8e7d4a4",
      releaseCoverArt:
        "0x4f0a8736685f6b1ddbcd0bddcd7aae2d072aa3d4043efc0ad4042a7786068999",
      genre:
        "0x01e58dbc76c15c9ac137dabac1823ebd6ef81efd563c5121000bc11c51a47cc7",
      releaseDescription:
        "0x50f5acf7c0c05cdc7656072fd1bfc5ee76d02beabeae090103734b2d75118fa3",
      releaseDspLink:
        "0x9ca9ad8cab49c4897cd3cb89628b771ee4f10831ddc273036837751a5339d02a",
      releaseGenre:
        "0xfb73b04be2f72704ec5e6a1035bfab108e5ee2a72e72c0505f999291e23219bd",
      releaseKind:
        "0xfb2e5790f0577aca3ac8ddd672c4c58ef1e49ef1c3dfe14fb9676aaabf769169",
      recordingAdvisory:
        "0x23abf3f248466c08edc3349b202d6e809064c0e52098ff290cef1fdc51d5942e",
      recordingLanguage:
        "0xb3e1c578638a79acc7ab573c994206047ad8ef76893f9c5c987887c5b10a5c68",
      recordingMasterReference:
        "0x92a752854b80a6103721743125ee48223b577a023fe360e25d3aa695462a6d15",
      recordingEngineSession:
        "0xdd8f817a221e2acd5a4e6f34d0192d8e0dbddeb76c2dff2fdc82991cb4feb6c6",
      recordSealPolicy:
        "0xfa22d0678eaec39ad36b74c2c5439d574292e8fb19a9a15272733267499d5351",
      recordingPreview:
        "0x2be8405f6b77a30d6942cb240c0d804d608ef761395e6f861b71d9ae3c98f997",
      ori: "0xf35cf353a62cef01084b51a9cf3da4c64c8724685ad1862f2f8284b71bd26c1a",
    },
    objects: {
      releaseRegistry:
        "0x452c9904677a1bbf92d4e07d86d2c3eb038c47595b0e17a23756f03887eb2a2a",
      genreRegistry:
        "0xda4cc070da1a71d43387973027a7230587a1b9c829d37c2af4a3adbc15fdb8a8",
      recordGate:
        "0x8fd51c8b31bb6012fb03d2be39ed7b9f0f581329b6b338c60c209110cc659f31",
    },
    legacy: {
      releaseCoverArtPackages: [],
    },
  },
} as const) satisfies Partial<Record<MisoNetwork, MisoPlatformDeployment>>;

/** Resolve a bundled platform deployment, failing closed when it is unavailable. */
export function getMisoPlatformDeployment(
  network: string,
): MisoPlatformDeployment {
  const deployment = (
    MISO_PLATFORM_DEPLOYMENTS as Partial<Record<string, MisoPlatformDeployment>>
  )[network];
  if (!deployment) {
    throw new Error(
      `@misofm/platform: no bundled Miso platform deployment for network "${network}". ` +
        "Pass an explicit deployment to miso() for custom networks.",
    );
  }
  return deployment;
}
