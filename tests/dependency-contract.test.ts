// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";

type PackageManifest = {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const repositoryRoot = `${import.meta.dir}/..`;
const exactVersions = {
  "@mysten/seal": "1.4.6",
  "@mysten/sui": "2.27.1",
} as const;
const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

async function readManifest(path: string): Promise<PackageManifest> {
  return Bun.file(path).json();
}

test("Seal and Sui use one exact development and peer dependency contract", async () => {
  const manifest = await readManifest(`${repositoryRoot}/package.json`);
  const consumer = await readManifest(
    `${repositoryRoot}/tests/fixtures/isolated-consumer/package.json`,
  );

  expect(Object.keys(consumer.dependencies ?? {})).toEqual([
    "@misofm/sdk",
    "typescript",
  ]);

  for (const [name, expectedVersion] of Object.entries(exactVersions)) {
    const developmentVersion = manifest.devDependencies?.[name];
    const peerVersion = manifest.peerDependencies?.[name];

    expect(developmentVersion, `${name} devDependency`).toBe(expectedVersion);
    expect(peerVersion, `${name} peerDependency`).toBe(expectedVersion);
    expect(developmentVersion, `${name} devDependency must be exact`).toMatch(
      exactVersionPattern,
    );
    expect(peerVersion, `${name} peerDependency must be exact`).toMatch(
      exactVersionPattern,
    );
    expect(
      consumer.devDependencies?.[name] ?? consumer.dependencies?.[name],
      `${name} must be resolved only through the SDK peer contract`,
    ).toBeUndefined();
  }
});

test("installed Seal and Sui match the declared exact versions", async () => {
  for (const [name, expectedVersion] of Object.entries(exactVersions)) {
    const installed = await readManifest(
      `${repositoryRoot}/node_modules/${name}/package.json`,
    );

    expect(installed.version, `${name} installed version`).toBe(expectedVersion);
  }
});

test("Seal accepts the SDK's exact Sui version", async () => {
  const seal = await readManifest(
    `${repositoryRoot}/node_modules/@mysten/seal/package.json`,
  );
  const sealSuiRange = seal.peerDependencies?.["@mysten/sui"];

  expect(sealSuiRange).toBeDefined();
  expect(Bun.semver.satisfies(exactVersions["@mysten/sui"], sealSuiRange!)).toBe(
    true,
  );
});
