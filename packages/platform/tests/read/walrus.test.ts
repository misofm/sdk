// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "bun:test";
import {
  quiltPatchId,
  u256ToB64Url,
  walrusBlobReadUrl,
} from "../../src/read/internal/walrus.ts";

describe("Walrus ids", () => {
  test("emits URL-safe unpadded blob ids", () => {
    expect(u256ToB64Url("42")).not.toMatch(/[+/=]/);
  });

  test("pins the aggregator's non-strict blob read mode", () => {
    expect(walrusBlobReadUrl("https://walrus.example/", "42")).toBe(
      `https://walrus.example/v1/blobs/${u256ToB64Url("42")}?strict_consistency_check=false`,
    );
  });

  test("encodes a 37-byte quilt patch id", () => {
    const id = quiltPatchId("42", 1, 2, 3);
    expect(id).not.toMatch(/[+/=]/);
    expect(id.length).toBe(50);
  });
});
