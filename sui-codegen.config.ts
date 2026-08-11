import type { SuiCodegenConfig } from "@mysten/codegen";

// Generates type-safe BCS structs + Move-call bindings from the live Move source,
// so the generated layer is always in lockstep with the on-chain ABI.
//
// PLATFORM packages only. Protocol packages (miso core, its extensions) generate
// into @misonetwork/miso-protocol instead — that split is the whole point of this
// package existing, so resist adding a protocol package here to save an import.
//
// To add a platform package:
//   1. add it below (plus any lib it needs);
//   2. run `bun run codegen` → bindings land in src/contracts/<package>/;
//   3. write a thin facade in src/<name>.ts and export it from src/index.ts.
const config: SuiCodegenConfig = {
  output: "./src/contracts",
  packages: [
    // The record production line: one uncapped run per release, plus a
    // `Listing<Currency>` per payment rail.
    { package: "@local-pkg/miso_pressing", path: "../miso-pressing/move" },
  ],
};

export default config;
