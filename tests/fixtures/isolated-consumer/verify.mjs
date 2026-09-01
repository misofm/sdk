import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import * as sdk from "@misofm/sdk";
import * as auth from "@misofm/sdk/auth";
import * as read from "@misofm/sdk/read";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const consumerRequire = createRequire(import.meta.url);
const sdkEntry = realpathSync(consumerRequire.resolve("@misofm/sdk"));
const sdkRequire = createRequire(sdkEntry);
const sealEntry = realpathSync(sdkRequire.resolve("@mysten/seal"));
const sealRequire = createRequire(sealEntry);

function resolvedRealPath(requireFrom, specifier) {
  return realpathSync(requireFrom.resolve(specifier));
}

function packageManifest(entry, expectedName) {
  let directory = dirname(entry);

  while (true) {
    const manifestPath = join(directory, "package.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (manifest.name === expectedName) return manifest;
    }

    const parent = dirname(directory);
    invariant(parent !== directory, `could not locate ${expectedName} package.json`);
    directory = parent;
  }
}

function installedPackageInstances(packageName) {
  const store = join(import.meta.dirname, "node_modules", ".bun");
  const packagePath = packageName.split("/");
  const instances = new Set();

  for (const slot of readdirSync(store)) {
    const manifestPath = join(store, slot, "node_modules", ...packagePath, "package.json");
    if (!existsSync(manifestPath)) continue;

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.name === packageName) instances.add(realpathSync(manifestPath));
  }

  return instances;
}

const sdkInstances = installedPackageInstances("@misofm/sdk");
const sealInstances = installedPackageInstances("@mysten/seal");
const suiInstances = installedPackageInstances("@mysten/sui");
const resolvedSuiInstances = new Set([
  resolvedRealPath(sdkRequire, "@mysten/sui/transactions"),
  resolvedRealPath(sealRequire, "@mysten/sui/transactions"),
]);
const sealManifest = packageManifest(sealEntry, "@mysten/seal");
const suiManifest = packageManifest(
  resolvedRealPath(sdkRequire, "@mysten/sui/transactions"),
  "@mysten/sui",
);

invariant(Object.keys(sdk).length > 0, "root export did not load");
invariant(Object.keys(auth).length > 0, "auth export did not load");
invariant(Object.keys(read).length > 0, "read export did not load");
invariant(sdkInstances.size === 1, "consumer installed multiple SDK instances");
invariant(sealInstances.size === 1, "consumer installed multiple Seal instances");
invariant(suiInstances.size === 1, "consumer installed multiple Sui instances");
invariant(
  resolvedSuiInstances.size === 1,
  "SDK and Seal resolved different Sui instances",
);
invariant(sealManifest.version === "1.4.6", "SDK peer resolved the wrong Seal");
invariant(suiManifest.version === "2.27.1", "SDK peer resolved the wrong Sui");

console.log("isolated consumer dependency identity verified");
