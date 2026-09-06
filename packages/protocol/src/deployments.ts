// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeSuiAddress } from "@mysten/sui/utils";

/** Sui networks for which this SDK may bundle a verified deployment. */
export type MisoNetwork = "mainnet" | "testnet";

/**
 * Every independently published package required by this SDK surface.
 *
 * These names are stable deployment-manifest keys, not Move module names. Their
 * values are never inferred from source labels or a previous publish.
 */
const CANONICAL_MISO_PACKAGE_NAMES = [
  "miso",
  "compositionCredits",
  "recordingAdvisory",
  "recordingCredits",
  "recordingLanguage",
  "recordingMasterReference",
  "recordingPreview",
  "releaseCoverArt",
  "releaseCredits",
  "releaseDescription",
  "releaseDspLink",
  "releaseGenre",
  "releaseKind",
  "royaltyPool",
  "routedStake",
  "misoParty",
  "partyCta",
  "partyGenre",
  "partyMedia",
  "partyMusic",
  "partyPlatformLink",
  "partyProLink",
  "partyProfile",
  "partyRoles",
  "partySocial",
  "partyTags",
  "countryCode",
  "languageCode",
  "genre",
] as const;

/** Public immutable copy; validation always uses the private canonical tuple. */
export const MISO_PACKAGE_NAMES = Object.freeze([
  ...CANONICAL_MISO_PACKAGE_NAMES,
]) as readonly [...typeof CANONICAL_MISO_PACKAGE_NAMES];

export type MisoPackageName = (typeof CANONICAL_MISO_PACKAGE_NAMES)[number];

/**
 * Exact package addresses from one compatible publish set.
 *
 * A complete manifest is intentional: a caller cannot accidentally combine
 * generated bindings for a fresh ABI with stale package IDs. Fill this only from
 * the verified immutable `admin-cli` publish record after the dependency-ordered
 * releases are complete.
 */
export type MisoDeployment = Readonly<Record<MisoPackageName, string>>;

/** A minimal core-only deployment, retained for callers that use only `miso()`. */
export interface MisoProtocolDeployment {
  /** The published `miso` package used for calls, types, and derived IDs. */
  readonly packageId: string;
}

/** Validate and freeze a core-only package binding at a client boundary. */
export function normalizeMisoProtocolDeployment(
  deployment: unknown,
): MisoProtocolDeployment {
  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)) {
    throw new Error("@misonetwork/sdk: core deployment must be an object with a normalized Miso package ID.");
  }
  const packageId = (deployment as { packageId?: unknown }).packageId;
  if (typeof packageId !== "string") {
    throw new Error("@misonetwork/sdk: core deployment is missing a Miso package ID.");
  }
  let normalized: string;
  try {
    normalized = normalizeSuiAddress(packageId);
  } catch {
    throw new Error("@misonetwork/sdk: core deployment package ID is not a valid Sui address.");
  }
  if (packageId !== normalized) {
    throw new Error(
      `@misonetwork/sdk: core deployment package ID must be normalized (${normalized}).`,
    );
  }
  return Object.freeze({ packageId });
}

/** Verified immutable deployments bundled with this SDK release. */
export const MISO_DEPLOYMENTS = Object.freeze({
  testnet: Object.freeze({
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
  } as const),
} as const) satisfies Partial<
  Record<MisoNetwork, MisoDeployment>
>;

/**
 * @deprecated Use `MISO_DEPLOYMENTS`. This alias preserves source compatibility
 * for callers that still use the former protocol-only constant name.
 */
export const MISO_PROTOCOL_DEPLOYMENTS = MISO_DEPLOYMENTS;

/** Resolve a verified full manifest, failing closed for unbundled networks. */
export function getMisoDeployment(network: string): MisoDeployment {
  const deployment = (
    MISO_DEPLOYMENTS as Partial<Record<string, MisoDeployment>>
  )[network];
  if (!deployment) {
    throw new Error(
      `@misonetwork/sdk: no verified Miso deployment is bundled for network "${network}". ` +
        "Inject the exact post-publish manifest or pass an explicit deployment; historic package IDs are rejected.",
    );
  }
  return normalizeMisoDeployment(deployment);
}

/** Extract the core package identity from a complete deployment manifest. */
export function protocolDeployment(
  deployment: MisoDeployment,
): MisoProtocolDeployment {
  return normalizeMisoProtocolDeployment({ packageId: normalizeMisoDeployment(deployment).miso });
}

/** Resolve the core package only, preserving the established `miso()` default API. */
export function getMisoProtocolDeployment(
  network: string,
): MisoProtocolDeployment {
  return protocolDeployment(getMisoDeployment(network));
}

/**
 * Validates an explicit manifest before any Move target is constructed. This is
 * useful at configuration boundaries such as environment-file loading.
 */
export function assertMisoDeployment(
  deployment: unknown,
): asserts deployment is MisoDeployment {
  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)) {
    throw new Error(
      `@misonetwork/sdk: deployment must be an object with exactly ${CANONICAL_MISO_PACKAGE_NAMES.length} Miso package IDs.`,
    );
  }
  const entries = deployment as Record<string, unknown>;
  const keys = Object.keys(entries);
  const unexpected = keys.filter((key) => !CANONICAL_MISO_PACKAGE_NAMES.includes(key as MisoPackageName));
  if (unexpected.length > 0 || keys.length !== CANONICAL_MISO_PACKAGE_NAMES.length) {
    throw new Error(
      `@misonetwork/sdk: deployment must contain exactly these package IDs: ${CANONICAL_MISO_PACKAGE_NAMES.join(", ")}.`,
    );
  }
  const seenPackageIds = new Set<string>();
  for (const name of CANONICAL_MISO_PACKAGE_NAMES) {
    const packageId = entries[name];
    if (typeof packageId !== "string") {
      throw new Error(
        `@misonetwork/sdk: deployment is missing package ID for "${name}". ` +
          "Use a complete manifest from the fresh verified immutable admin-cli publish record.",
      );
    }
    let normalized: string;
    try {
      normalized = normalizeSuiAddress(packageId);
    } catch {
      throw new Error(`@misonetwork/sdk: deployment package ID for "${name}" is not a valid Sui address.`);
    }
    if (packageId !== normalized) {
      throw new Error(
        `@misonetwork/sdk: deployment package ID for "${name}" must be normalized (${normalized}).`,
      );
    }
    if (seenPackageIds.has(packageId)) {
      throw new Error(
        `@misonetwork/sdk: deployment package ID for "${name}" duplicates another package. ` +
          "A publish manifest must bind every package to its own address.",
      );
    }
    seenPackageIds.add(packageId);
  }
}

/** Validate and snapshot an untrusted manifest so later caller mutation is inert. */
export function normalizeMisoDeployment(deployment: unknown): MisoDeployment {
  assertMisoDeployment(deployment);
  return Object.freeze(
    Object.fromEntries(CANONICAL_MISO_PACKAGE_NAMES.map((name) => [name, deployment[name]])),
  ) as MisoDeployment;
}
