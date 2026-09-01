// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";

const suiBcsImport = /^import .* from '@mysten\/sui\/bcs';$/m;
const directBcsAnchor = 'import type {} from "@mysten/bcs";';

test("generated BCS modules carry exactly one direct declaration anchor", async () => {
  const generated = new Bun.Glob("src/contracts/**/*.ts");

  for await (const path of generated.scan({ cwd: import.meta.dir + "/.." })) {
    const source = await Bun.file(import.meta.dir + "/../" + path).text();
    const anchorCount = source
      .split("\n")
      .filter((line) => line === directBcsAnchor).length;

    expect(anchorCount, path).toBe(suiBcsImport.test(source) ? 1 : 0);
  }
});
