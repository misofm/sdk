// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
  MisoNetwork,
  MisoProtocolDeployment,
} from "@misonetwork/sdk/deployments";

/** Complete on-chain identity used by the Miso platform SDK on one network. */
export interface MisoPlatformDeployment {
  /** The protocol deployment this platform deployment was built against. */
  readonly protocol: MisoProtocolDeployment;
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
    readonly compositionRoyaltyPoolPlugin: string;
    /** Vault plugin that creates and cranks Recording royalty pools. */
    readonly recordingRoyaltyPoolPlugin: string;
    /** Generic stake wrapper used by the composition routed-stake plugin. */
    readonly routedStake: string;
    /** Vault plugin for Composition-owned Recording-share staking. */
    readonly compositionRoutedStakePlugin: string;
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
    readonly releaseRevenueDistributorPlugin: string;
    readonly recordingAdvisory: string;
    readonly recordingLanguage: string;
    readonly recordingMasterReference: string;
    readonly recordingPreview: string;
    /** External `ori::walrus_data::WalrusData` dependency used by cover art. */
    readonly ori: string;
  };
  readonly objects: {
    readonly recordSettings: string;
    readonly releaseRegistry: string;
    /** Shared parent used to derive canonical Genre object ids. */
    readonly genreRegistry: string;
  };
  /** PartyOS packages used by the composed artist and wallet reads. */
  readonly party: {
    readonly partyPackageId: string;
    readonly partyProfilePackageId: string;
    readonly countryCodePackageId: string;
    readonly languageCodePackageId: string;
    readonly partyMediaPackageId: string;
    readonly partyRolesPackageId: string;
    readonly partyTagsPackageId: string;
    readonly partyGenrePackageId: string;
    readonly partyCtaPackageId: string;
    readonly partyPlatformLinkPackageId: string;
    readonly partySocialPackageId: string;
    readonly partyMusicPackageId: string;
    readonly partyProLinkPackageId: string;
    readonly partyFeaturedDropPackageId: string;
    readonly genrePackageId: string;
  };
  readonly legacy: {
    readonly releaseCoverArtPackages: readonly string[];
  };
}

/**
 * Platform deployments bundled with this SDK release.
 *
 * This release deliberately contains no bundled network deployment. The core
 * protocol is being republished as an immutable stack, so every old package ID
 * is an incompatible ABI and must not be selected by accident. The admin-cli
 * deployment flow injects verified IDs in a follow-up change.
 */
export const MISO_PLATFORM_DEPLOYMENTS = {} as const satisfies Partial<
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
