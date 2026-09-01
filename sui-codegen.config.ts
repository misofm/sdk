import type { SuiCodegenConfig } from "@mysten/codegen";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Generates type-safe BCS structs + Move-call bindings from the live Move source,
// so the generated layer is always in lockstep with the on-chain ABI.
//
// PLATFORM + DATA-EXTENSION packages. The protocol CORE (`miso` — Composition,
// Recording, Release, Track) generates into `@misonetwork/sdk` instead, and
// this package depends on it for those bindings; adding the core here to save an
// import is how the split this package exists to enforce gets undone.
//
// Extensions add data to a protocol work. Vault plugins instead custody an admin
// cap and provide business logic through a temporary, hot-potato capability loan.
// Both are part of the platform client, but they deliberately have different
// packages and bindings. Core `miso::release::ReleaseRegistry` is the canonical
// shared derivation parent, and core `release::new` is PTB-callable.
//
// Paths resolve against sibling checkouts. For an isolated SDK worktree, set
// MISO_SDK_CODEGEN_SOURCE_ROOT to a copied checkout root containing both
// `misofm/` and `misonetwork/`; codegen then never writes summaries or locks into
// a developer's live sibling sources. Regenerating requires:
//   ~/Documents/GitHub/misofm/{sdk, record, record-shop, vault, vault-plugins}
//   ~/Documents/GitHub/misonetwork/{protocol, protocol-extensions,
//     royalty-pool, routed-stake, share}
const sourceRoot =
  process.env.MISO_SDK_CODEGEN_SOURCE_ROOT ??
  fileURLToPath(new URL("../..", import.meta.url));
const source = (path: string) => resolve(sourceRoot, path);

const config: SuiCodegenConfig = {
  output: "./src/contracts",
  packages: [
    // Record identity and edition-scoped Pressings are separate from the
    // primary-sale mechanics supplied by Record Shop.
    { package: "@local-pkg/miso_record", path: source("misofm/record") },
    {
      package: "@local-pkg/miso_record_shop",
      path: source("misofm/record-shop"),
    },

    // Royalty pools — accumulator-based distribution bound to a work.
    {
      package: "@local-pkg/royalty_pool",
      path: source("misonetwork/royalty-pool"),
    },

    // Capability custody plus installed business-logic plugins. These are not
    // protocol extensions: their entry points borrow the cap from Vault and
    // return it in the same PTB through vault::put_back.
    { package: "@local-pkg/vault", path: source("misofm/vault") },
    {
      package: "@local-pkg/composition_royalty_pool",
      path: source("misofm/vault-plugins/composition_royalty_pool"),
    },
    {
      package: "@local-pkg/recording_royalty_pool",
      path: source("misofm/vault-plugins/recording_royalty_pool"),
    },
    {
      package: "@local-pkg/party_wallet",
      path: source("misofm/vault-plugins/party_wallet"),
    },
    {
      package: "@local-pkg/composition_routed_stake",
      path: source("misofm/vault-plugins/composition_routed_stake"),
    },
    {
      package: "@local-pkg/routed_stake",
      path: source("misonetwork/routed-stake"),
    },

    // Cover art (a Walrus blob ref via ori, attached to a Release by
    // release_cover_art). Drives the app's record-purchase render.
    {
      package: "@local-pkg/cover_art",
      path: source("misonetwork/cover-art"),
    },
    // Caveat: release_cover_art transitively depends on ori (walrus_data), which
    // is NOT declared here, so its dep bindings land under the deployed package
    // address (src/contracts/release_cover_art/deps/0x340057f2…/walrus_data.ts)
    // rather than a readable name. @mysten/codegen has no address→name mapping
    // for transitive deps (only declared packages get names, and declaring ori
    // would generate full bindings for an external package). If ori is ever
    // redeployed, re-run codegen so the baked dep address tracks the new one.
    {
      package: "@local-pkg/release_cover_art",
      path: source("misonetwork/protocol-extensions/release_cover_art"),
    },

    // Release presentation + discovery metadata. These are independent
    // cap-gated extensions over the core Release; the publish intent aggregates
    // them, but each package stays separately deployable.
    { package: "@local-pkg/genre", path: source("misonetwork/genre") },
    {
      package: "@local-pkg/release_description",
      path: source("misonetwork/protocol-extensions/release_description"),
    },
    {
      package: "@local-pkg/release_dsp_link",
      path: source("misonetwork/protocol-extensions/release_dsp_link"),
    },
    {
      package: "@local-pkg/release_genre",
      path: source("misonetwork/protocol-extensions/release_genre"),
    },
    {
      package: "@local-pkg/release_kind",
      path: source("misonetwork/protocol-extensions/release_kind"),
    },

    // Recording metadata is data-only; its cap-gated writers work with either a
    // legacy direct cap or a Vault loan through the SDK authority helpers.
    {
      package: "@local-pkg/recording_advisory",
      path: source("misonetwork/protocol-extensions/recording_advisory"),
    },
    {
      package: "@local-pkg/recording_language",
      path: source("misonetwork/protocol-extensions/recording_language"),
    },
    {
      package: "@local-pkg/recording_master_reference",
      path: source("misonetwork/protocol-extensions/recording_master_reference"),
    },
    {
      package: "@local-pkg/recording_preview",
      path: source("misonetwork/protocol-extensions/recording_preview"),
    },

    // Runtime release economics is business logic, so it is a vault plugin.
    {
      package: "@local-pkg/release_revenue_distributor",
      path: source("misofm/vault-plugins/release_revenue_distributor"),
    },

    // Credits — contributor attribution (display name + roles) attached to a
    // work via a dynamic field, gated by the work's admin cap. The shared
    // `miso_credit::credit::Credit<Role>` type is pulled in as a dep. Drives the
    // credits CLI flow and the app's contributor render.
    {
      package: "@local-pkg/composition_credits",
      path: source("misonetwork/protocol-extensions/composition_credits"),
    },
    {
      package: "@local-pkg/recording_credits",
      path: source("misonetwork/protocol-extensions/recording_credits"),
    },
    {
      package: "@local-pkg/release_credits",
      path: source("misonetwork/protocol-extensions/release_credits"),
    },
  ],
};

export default config;
