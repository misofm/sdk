// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  MISO_PROTOCOL_DEPLOYMENTS,
  type MisoNetwork,
  type MisoProtocolDeployment,
} from "@misonetwork/sdk/deployments";

/** Complete on-chain identity used by the Miso platform SDK on one network. */
export interface MisoPlatformDeployment {
  /** The protocol deployment this platform deployment was built against. */
  readonly protocol: MisoProtocolDeployment;
  readonly packages: {
    readonly pressing: string;
    readonly record: string;
    readonly releaseRegistry: string;
    readonly minato: string;
    readonly drop: string;
    readonly credit: string;
    readonly compositionCredits: string;
    readonly recordingCredits: string;
    readonly releaseCredits: string;
    readonly releaseCoverArt: string;
  };
  readonly objects: {
    readonly recordSettings: string;
    readonly releaseRegistry: string;
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
 * Mainnet is intentionally absent until the complete platform stack is live.
 * Mainnet is intentionally unavailable until this ABI is deployed there.
 */
export const MISO_PLATFORM_DEPLOYMENTS = {
  testnet: {
    protocol: MISO_PROTOCOL_DEPLOYMENTS.testnet,
    packages: {
      pressing:
        "0xd0913b584d87a3891a8013c58644e3896f438fd948e819a69db256b47314974e",
      record:
        "0x97e2772d81528c69e21b6681f6702f90deae2a6b079e19da1df53f9f4fdd3271",
      releaseRegistry:
        "0x683b2feb784a815171d2976418345bd41c046e159dcf7a16890c766f69fd7808",
      minato:
        "0x8466e9864c1d947888e73b0e349b035bc22805579eef18f132966f56c8efe1d2",
      drop:
        "0xfc2b51f068dee9d5482d39fa017164f6a8c3601cabb59084a518de5f609ef1c7",
      credit:
        "0x0121926470393cc93b89b5b6d5067737a8bc0c1c545fb96c4447569174116174",
      compositionCredits:
        "0xfa2f62db28f2eb42c8c1a6533097fb2095649efab05c0527be1874b9be6cdc73",
      recordingCredits:
        "0xc794252bd90efb4cc224107f9dd0a56d4f4f5623783628b6af286f6535dd4c1e",
      releaseCredits:
        "0x42e2dbf6098d18782911460ecf79b338af2f1b654ef7ba99c6e7344fd4bf3f94",
      releaseCoverArt:
        "0x831a612920343696de7e8f0603ff4c0b21c43ca3de478feb96d230e263cd11d4",
    },
    objects: {
      recordSettings:
        "0x6a005dad071562d421ad7a9d368289f5c9f0408ca495cd466a1f774d65a21fa7",
      releaseRegistry:
        "0x5941b8690916e762a7583363906496d64a6ea3e6cedb078c90e23e7c671544f2",
    },
    party: {
      partyPackageId:
        "0x09a812d46c3aa3978703c8e5a7409ba67b9ba2dfdb91154e48ebdd9d2415da0c",
      partyProfilePackageId:
        "0xce89d3f993dfebc0b697388598c3b01e9db7b73fa2e8df18ed22608cf7ac5aee",
      countryCodePackageId:
        "0x6c3a53f228ccd089825d0fb5ee1f0465a4b7a438bc1b1735b4e2f01df8d056e9",
      languageCodePackageId:
        "0xa18b786807cfc45488691f93aa647800b77cf9993e420d110afd7024c5b15948",
      partyMediaPackageId:
        "0x7db56ef37692f84c1cfb0e0b26bde35ac9f1bc0bcd91ac5d24b3f8b4d1821349",
      partyRolesPackageId:
        "0x41a442a2c39368af2181e73ea5b90e2e0b4f89de09050c121a6e7d79e7c84415",
      partyTagsPackageId:
        "0xa4c7f6b05bb9b612ea7640974c150ce31ad7927ea82d3f9f4673acac7deef0da",
      partyGenrePackageId:
        "0x6ce063438be6cf44ccf5f17bf8892c9e0cef4e2344442aeb44412beead74d3a8",
      partyCtaPackageId:
        "0x85a312210d9ddbae535e0f933032c8a56aa3f0fe1d6c3430d4fa538765008da3",
      partyPlatformLinkPackageId:
        "0x46d9f3e05d2065a926b010fe833baf61e5c250c233d512a260cbe746b02c56af",
      partySocialPackageId:
        "0x438e767ce8f5699f12be1704a12ff69c28045ca241f890ca8a978d55e09f6541",
      partyMusicPackageId:
        "0x89add347dfa779aa77e21b1853a37f2054dbecfce29799b61463d9900877b7b1",
      partyProLinkPackageId:
        "0xe5e8a0d02b43037abb7e6ddb4b742c6197aadf2dc19910957bba98307bef4103",
      partyFeaturedDropPackageId:
        "0x1a7b926686565a6cc82a9e0630839dc1f75c9bf4fafc0ba789a05af2c3c269f0",
      genrePackageId:
        "0xcbbce10e8b0781d458e88ce99d08e0c85f1e674c5b7ec975383d74f87a1d76b1",
    },
    legacy: {
      releaseCoverArtPackages: [
        "0x25c3c87ef4823d62d80dd8bda714ef4976df0f04453997646659a6cebadd655b",
        "0x1ee2cae0da7595d7973c310c912434ef531589b468cc57839296810c1385f7f6",
        "0x7d4a205a68f8e768a408c9f4c45a4d4076722c5edeba9068c0ac058f554e964e",
      ],
    },
  },
} as const satisfies Partial<Record<MisoNetwork, MisoPlatformDeployment>>;

/** Resolve a bundled platform deployment, failing closed when it is unavailable. */
export function getMisoPlatformDeployment(
  network: string,
): MisoPlatformDeployment {
  const deployment = (
    MISO_PLATFORM_DEPLOYMENTS as Partial<
      Record<string, MisoPlatformDeployment>
    >
  )[network];
  if (!deployment) {
    throw new Error(
      `@misofm/sdk: no bundled Miso platform deployment for network "${network}". ` +
        "Pass an explicit deployment to miso() for custom networks.",
    );
  }
  return deployment;
}
