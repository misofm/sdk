// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// The owned-records scan, against a fake client. Ported from miso-app's
// `src/lib/records.test.ts` — the logic moved here, so its coverage did too.

import { describe, expect, test } from "bun:test";
import { getOwnedRecords } from "../../src/read/wallet.ts";
import type { MisoClient } from "../../src/read/client.ts";

type Obj = { objectId: string; type: string; json?: Record<string, unknown> | null };
type Page = { objects: Obj[]; hasNextPage: boolean; cursor: string | null };

/** A client whose `listOwnedObjects` serves the given pages in order. */
const RECORD_PACKAGE = "0x" + "ab".repeat(32);
const WRONG_RECORD_PACKAGE = "0x" + "cd".repeat(32);
const RECORD_TYPE = `${RECORD_PACKAGE}::record::Record`;
const WRONG_RECORD_TYPE = `${WRONG_RECORD_PACKAGE}::record::Record`;

function fakeClient(pages: Page[]): { client: MisoClient; calls: number; types: string[] } {
  const state = { calls: 0, types: [] as string[] };
  const client = {
    config: { protocol: { record: RECORD_PACKAGE } },
    protocol: {
      core: {
        listOwnedObjects: async ({ type }: { type?: string }) => {
          if (type) state.types.push(type);
          const page = pages[state.calls] ?? { objects: [], hasNextPage: false, cursor: null };
          state.calls++;
          return page;
        },
      },
    },
  } as unknown as MisoClient;
  return {
    client,
    get calls() {
      return state.calls;
    },
    get types() {
      return state.types;
    },
  };
}

describe("getOwnedRecords", () => {
  test("matches only the configured fresh record package", async () => {
    const fake = fakeClient([
      {
        objects: [
          { objectId: "0x1", type: RECORD_TYPE, json: { release_id: "0xrel", number: 3 } },
          { objectId: "0x2", type: WRONG_RECORD_TYPE, json: { release_id: "0xrel", number: 4 } },
        ],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const records = await getOwnedRecords(fake.client, "0xowner");
    expect(records.map((r) => r.id)).toEqual(["0x1"]);
    expect(fake.types).toEqual([RECORD_TYPE]);
  });

  test("skips objects that are not records", async () => {
    const { client } = fakeClient([
      {
        objects: [
          { objectId: "0xcoin", type: "0x2::coin::Coin<0x2::sui::SUI>", json: {} },
          { objectId: "0x1", type: RECORD_TYPE, json: { release_id: "0xrel" } },
        ],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const records = await getOwnedRecords(client, "0xowner");
    expect(records).toHaveLength(1);
    expect(records[0]!.id).toBe("0x1");
  });

  test("reads the canonical copy number", async () => {
    const { client } = fakeClient([
      {
        objects: [
          { objectId: "0x1", type: RECORD_TYPE, json: { release_id: "0xa", number: 7 } },
        ],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const records = await getOwnedRecords(client, "0xowner");
    expect(records[0]!.number).toBe(7);
  });

  test("follows pagination until the last page", async () => {
    const page = (id: string, hasNext: boolean, cursor: string | null): Page => ({
      objects: [{ objectId: id, type: RECORD_TYPE, json: { release_id: "0xrel" } }],
      hasNextPage: hasNext,
      cursor,
    });
    const fake = fakeClient([page("0x1", true, "c1"), page("0x2", true, "c2"), page("0x3", false, null)]);
    const records = await getOwnedRecords(fake.client, "0xowner");
    expect(records.map((r) => r.id)).toEqual(["0x1", "0x2", "0x3"]);
    expect(fake.calls).toBe(3);
  });

  test("stops at the page cap so a huge wallet can't spin forever", async () => {
    const endless: Page[] = Array.from({ length: 50 }, (_, i) => ({
      objects: [{ objectId: `0x${i}`, type: RECORD_TYPE, json: {} }],
      hasNextPage: true,
      cursor: `c${i}`,
    }));
    const fake = fakeClient(endless);
    const records = await getOwnedRecords(fake.client, "0xowner");
    expect(fake.calls).toBe(20);
    expect(records).toHaveLength(20);
  });

  test("stops when the node claims another page but returns no cursor", async () => {
    const fake = fakeClient([
      { objects: [{ objectId: "0x1", type: RECORD_TYPE, json: {} }], hasNextPage: true, cursor: null },
    ]);
    const records = await getOwnedRecords(fake.client, "0xowner");
    expect(records).toHaveLength(1);
    expect(fake.calls).toBe(1);
  });

  test("a record with no parsable release id or number is still listed", async () => {
    const { client } = fakeClient([
      { objects: [{ objectId: "0x1", type: RECORD_TYPE, json: null }], hasNextPage: false, cursor: null },
    ]);
    const [record] = await getOwnedRecords(client, "0xowner");
    expect(record).toEqual({ id: "0x1", type: RECORD_TYPE, releaseId: null, number: null });
  });
});
