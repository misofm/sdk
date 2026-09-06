import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";

import * as platformRoot from "@misofm/platform";
import * as platformClient from "@misofm/platform/client";
import * as platformPressing from "@misofm/platform/pressing";
import * as platformVault from "@misofm/platform/vault";
import * as platformRead from "@misofm/platform/read";
import * as platformCredits from "@misofm/platform/credits";

import * as protocolRoot from "@misofm/protocol";
import * as protocolClient from "@misofm/protocol/client";
import * as protocolParty from "@misofm/protocol/party";
import * as protocolQueries from "@misofm/protocol/queries";
import * as protocolContracts from "@misofm/protocol/contracts";
import * as recordModule from "@misofm/protocol/contracts/miso_record/record";
import * as languageCodeModule from "@misofm/protocol/contracts/recording_language/deps/language_code/language_code";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function hasExport(namespace, name) {
  return Object.prototype.hasOwnProperty.call(namespace, name);
}

// --- module load + expected-export checks -------------------------------

invariant(Object.keys(platformRoot).length > 0, "@misofm/platform root export did not load");
invariant(hasExport(platformRoot, "MisoClient"), "@misofm/platform root missing MisoClient");
invariant(hasExport(platformRoot, "contracts"), "@misofm/platform root missing contracts namespace");

invariant(Object.keys(platformClient).length > 0, "@misofm/platform/client export did not load");
invariant(hasExport(platformClient, "MisoPlatformClient"), "@misofm/platform/client missing MisoPlatformClient");

invariant(Object.keys(platformPressing).length > 0, "@misofm/platform/pressing export did not load");
invariant(hasExport(platformPressing, "derivePressingId"), "@misofm/platform/pressing missing derivePressingId");

invariant(Object.keys(platformVault).length > 0, "@misofm/platform/vault export did not load");
invariant(hasExport(platformVault, "directAdminCap"), "@misofm/platform/vault missing directAdminCap");

invariant(Object.keys(platformRead).length > 0, "@misofm/platform/read export did not load");
invariant(hasExport(platformRead, "misoConfig"), "@misofm/platform/read missing misoConfig");

invariant(Object.keys(platformCredits).length > 0, "@misofm/platform/credits export did not load");
invariant(hasExport(platformCredits, "attachCompositionCredit"), "@misofm/platform/credits missing attachCompositionCredit");

invariant(Object.keys(protocolRoot).length > 0, "@misofm/protocol root export did not load");
invariant(hasExport(protocolRoot, "MisoClient"), "@misofm/protocol root missing MisoClient");
invariant(hasExport(protocolRoot, "party"), "@misofm/protocol root missing party namespace");
invariant(hasExport(protocolRoot, "contracts"), "@misofm/protocol root missing contracts namespace");

invariant(Object.keys(protocolClient).length > 0, "@misofm/protocol/client export did not load");
invariant(hasExport(protocolClient, "MisoProtocolClient"), "@misofm/protocol/client missing MisoProtocolClient");

invariant(Object.keys(protocolParty).length > 0, "@misofm/protocol/party export did not load");
invariant(hasExport(protocolParty, "PartyProtocolClient"), "@misofm/protocol/party missing PartyProtocolClient");

invariant(Object.keys(protocolQueries).length > 0, "@misofm/protocol/queries export did not load");
invariant(hasExport(protocolQueries, "isNotFound"), "@misofm/protocol/queries missing isNotFound");
invariant(protocolQueries.isNotFound(new Error("not found")) === false, "isNotFound behaved unexpectedly");

invariant(Object.keys(protocolContracts).length > 0, "@misofm/protocol/contracts export did not load");
invariant(hasExport(protocolContracts, "party"), "@misofm/protocol/contracts (curated) missing party");
invariant(
  typeof protocolContracts.party._new === "function",
  "@misofm/protocol/contracts (curated) party._new did not load as a function",
);
invariant(
  !("uid" in protocolContracts.party),
  "@misofm/protocol/contracts (curated) leaked the raw `uid` accessor it is meant to curate away",
);

// Raw wildcard subpath: a deep module and a nested `deps/*` module that are
// NOT reachable through the curated `./contracts` barrel.
invariant(Object.keys(recordModule).length > 0, "@misofm/protocol/contracts/miso_record/record did not load");
invariant(hasExport(recordModule, "Record"), "raw contracts/miso_record/record missing Record");
invariant(typeof recordModule.Record.parse === "function", "Record BCS codec missing parse()");

invariant(
  Object.keys(languageCodeModule).length > 0,
  "@misofm/protocol/contracts/recording_language/deps/language_code/language_code did not load",
);
invariant(hasExport(languageCodeModule, "LanguageCode"), "raw nested deps/language_code module missing LanguageCode");
invariant(typeof languageCodeModule.LanguageCode.parse === "function", "LanguageCode BCS codec missing parse()");

// --- dependency identity: package manager agnostic -----------------------
//
// Walks every `node_modules` directory reachable from this consumer (real
// directories only — a symlinked directory is left alone rather than walked
// into again, which keeps this terminating regardless of whether the
// package manager hoists, nests, or symlinks). Works the same whether the
// consumer was installed with npm, bun, or pnpm.

function collectNodeModulesDirs(root) {
  const found = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue; // skips symlinks too (isDirectory() is false for them)
      const full = join(dir, entry.name);
      if (entry.name === "node_modules") {
        found.push(full);
        walk(full);
      } else if (entry.name !== ".bin") {
        walk(full);
      }
    }
  }
  walk(root);
  return found;
}

function findPackageInstances(root, packageName) {
  const parts = packageName.split("/");
  const instances = new Set();
  for (const nodeModulesDir of collectNodeModulesDirs(root)) {
    const manifestPath = join(nodeModulesDir, ...parts, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.name === packageName) instances.add(realpathSync(manifestPath));
  }
  return instances;
}

const consumerRoot = import.meta.dirname;

const suiInstances = findPackageInstances(consumerRoot, "@mysten/sui");
invariant(suiInstances.size === 1, `expected exactly one @mysten/sui instance, found ${suiInstances.size}`);

const [suiManifestPath] = suiInstances;
const suiManifest = JSON.parse(readFileSync(suiManifestPath, "utf8"));

console.log(`isolated consumer verified: single @mysten/sui@${suiManifest.version} installed`);
console.log("isolated consumer dependency identity verified");
