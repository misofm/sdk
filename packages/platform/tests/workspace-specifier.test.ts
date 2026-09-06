// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";

// `npm pack` does NOT rewrite `workspace:*` (only `bun publish` does, and the
// publish workflow deliberately uses `npm publish --provenance` — bun publish
// does not produce provenance attestations). A `workspace:` specifier left in
// `dependencies`/`peerDependencies` therefore ships to npm verbatim: installing
// the tarball outside this workspace fails immediately (npm:
// EUNSUPPORTEDPROTOCOL, bun: "Workspace dependency ... not found"). This test
// asserts no publishable package in the workspace can carry that specifier
// into a tarball, regardless of which package it is added to in the future.

const workspaceSpecifierPattern = /^workspace:/;
const monorepoRoot = `${import.meta.dir}/../../..`;

test("no packages/* package.json declares a workspace: specifier as a runtime dependency", async () => {
  const packageManifests = new Bun.Glob("packages/*/package.json");
  const offenders: string[] = [];

  for await (const relativePath of packageManifests.scan({ cwd: monorepoRoot })) {
    const manifest = await Bun.file(`${monorepoRoot}/${relativePath}`).json();

    for (const field of ["dependencies", "peerDependencies"] as const) {
      for (const [name, range] of Object.entries(manifest[field] ?? {})) {
        if (workspaceSpecifierPattern.test(range as string)) {
          offenders.push(`${relativePath}: ${field}.${name} = "${range}"`);
        }
      }
    }
  }

  expect(
    offenders,
    "workspace: specifiers are not rewritten by `npm pack` and break installs outside the workspace",
  ).toEqual([]);
});
