// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pruneRemovedPackageDirectories } from "../scripts/codegen-output.ts";

test("codegen output is closed-world and prunes a removed package fixture", () => {
  const fixture = mkdtempSync(join(tmpdir(), "miso-sdk-codegen-output-"));
  try {
    mkdirSync(join(fixture, "miso"));
    mkdirSync(join(fixture, "release_registry"));
    mkdirSync(join(fixture, "unrelated-directory"));

    pruneRemovedPackageDirectories(fixture);

    expect(existsSync(join(fixture, "miso"))).toBeTrue();
    expect(existsSync(join(fixture, "release_registry"))).toBeFalse();
    expect(existsSync(join(fixture, "unrelated-directory"))).toBeFalse();
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
