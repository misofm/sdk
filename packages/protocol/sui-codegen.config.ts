import type { SuiCodegenConfig } from "@mysten/codegen";

// Generates the ABI-bound BCS structs and Move-call builders from the current
// sibling Move sources. Package IDs are injected at runtime by `deployments.ts`;
// no source-local address or previously published package ID is treated as live.
//
// `bun run codegen` deliberately writes every Move summary to a temporary
// directory before generating. It leaves these sibling source worktrees intact.
// Expected checkout layout:
//   misonetwork/{sdk,protocol,protocol-extensions,royalty-pool,routed-stake,
//                party,party-extensions}
const config: SuiCodegenConfig = {
  output: "./src/contracts",
  importExtension: ".ts",
  generateSummaries: false,
  packages: [
    { package: "@local-pkg/miso", path: "../protocol" },
    { package: "@local-pkg/composition_credits", path: "../protocol-extensions/composition_credits" },
    { package: "@local-pkg/recording_advisory", path: "../protocol-extensions/recording_advisory" },
    { package: "@local-pkg/recording_credits", path: "../protocol-extensions/recording_credits" },
    { package: "@local-pkg/recording_language", path: "../protocol-extensions/recording_language" },
    { package: "@local-pkg/recording_master_reference", path: "../protocol-extensions/recording_master_reference" },
    { package: "@local-pkg/recording_preview", path: "../protocol-extensions/recording_preview" },
    { package: "@local-pkg/release_cover_art", path: "../protocol-extensions/release_cover_art" },
    { package: "@local-pkg/release_credits", path: "../protocol-extensions/release_credits" },
    { package: "@local-pkg/release_description", path: "../protocol-extensions/release_description" },
    { package: "@local-pkg/release_dsp_link", path: "../protocol-extensions/release_dsp_link" },
    { package: "@local-pkg/release_genre", path: "../protocol-extensions/release_genre" },
    { package: "@local-pkg/release_kind", path: "../protocol-extensions/release_kind" },
    { package: "@local-pkg/royalty_pool", path: "../royalty-pool" },
    { package: "@local-pkg/routed_stake", path: "../routed-stake" },
    { package: "@local-pkg/miso_party", path: "../party" },
    { package: "@local-pkg/party_cta", path: "../party-extensions/party_cta" },
    { package: "@local-pkg/party_genre", path: "../party-extensions/party_genre" },
    { package: "@local-pkg/party_media", path: "../party-extensions/party_media" },
    { package: "@local-pkg/party_music", path: "../party-extensions/party_music" },
    { package: "@local-pkg/party_platform_link", path: "../party-extensions/party_platform_link" },
    { package: "@local-pkg/party_pro_link", path: "../party-extensions/party_pro_link" },
    { package: "@local-pkg/party_profile", path: "../party-extensions/party_profile" },
    { package: "@local-pkg/party_roles", path: "../party-extensions/party_roles" },
    { package: "@local-pkg/party_social", path: "../party-extensions/party_social" },
    { package: "@local-pkg/party_tags", path: "../party-extensions/party_tags" },
  ],
};

export default config;
