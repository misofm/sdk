import type { SuiCodegenConfig } from "@mysten/codegen";

// Generates type-safe BCS structs + Move-call bindings from the live Move source,
// so the generated layer is always in lockstep with the on-chain ABI.
//
// PLATFORM + EXTENSION packages. The protocol CORE (`miso` — Composition,
// Recording, Release, Track) generates into `@misonetwork/sdk` instead, and
// this package depends on it for those bindings; adding the core here to save an
// import is how the split this package exists to enforce gets undone.
//
// Extensions are on this side of the line deliberately: an extension is
// opinionated business logic hung off the protocol's `&mut UID` hook, not part of
// the protocol's data model, so it ships with the platform. The one exception is
// release creation: core's `release::new` takes `parent: &mut UID`, so it is not
// PTB-callable; the platform-owned `release_registry` extension is the canonical
// client-facing release-creation primitive.
//
// Paths resolve against sibling checkouts. Regenerating requires:
//   ~/Documents/GitHub/misofm/{sdk, pressing, protocol-extensions}
//   ~/Documents/GitHub/misonetwork/{protocol, share}
const config: SuiCodegenConfig = {
  output: "./src/contracts",
  packages: [
    // The record production line: one uncapped run per release, plus a
    // `Listing<Currency>` per payment rail.
    { package: "@local-pkg/miso_pressing", path: "../pressing/move" },

    // The canonical derivation parent for release ids. Core's `release::new` takes
    // `parent: &mut UID` and is therefore not PTB-callable; this shared singleton
    // is how a client actually mints a Release. Created once by the package's
    // `init` — discover its id from `ReleaseRegistryCreatedEvent` in the publish tx.
    { package: "@local-pkg/release_registry", path: "../protocol-extensions/release_registry" },

    // Royalty pools — accumulator-based distribution bound to a work.
    { package: "@local-pkg/royalty_pool", path: "../protocol-extensions/lib/royalty_pool" },
    { package: "@local-pkg/composition_royalty_pool", path: "../protocol-extensions/composition_royalty_pool" },
    { package: "@local-pkg/recording_royalty_pool", path: "../protocol-extensions/recording_royalty_pool" },

    // Cover art (a Walrus blob ref via ori, attached to a Release by
    // release_cover_art). Drives the app's record-purchase render.
    { package: "@local-pkg/cover_art", path: "../protocol-extensions/lib/cover_art" },
    // Caveat: release_cover_art transitively depends on ori (walrus_data), which
    // is NOT declared here, so its dep bindings land under the deployed package
    // address (src/contracts/release_cover_art/deps/0x340057f2…/walrus_data.ts)
    // rather than a readable name. @mysten/codegen has no address→name mapping
    // for transitive deps (only declared packages get names, and declaring ori
    // would generate full bindings for an external package). If ori is ever
    // redeployed, re-run codegen so the baked dep address tracks the new one.
    { package: "@local-pkg/release_cover_art", path: "../protocol-extensions/release_cover_art" },

    // Credits — contributor attribution (display name + roles) attached to a
    // work via a dynamic field, gated by the work's admin cap. The shared
    // `miso_credit::credit::Credit<Role>` type is pulled in as a dep. Drives the
    // credits CLI flow and the app's contributor render.
    { package: "@local-pkg/composition_credits", path: "../protocol-extensions/composition_credits" },
    { package: "@local-pkg/recording_credits", path: "../protocol-extensions/recording_credits" },
    { package: "@local-pkg/release_credits", path: "../protocol-extensions/release_credits" },
  ],
};

export default config;
