// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// The owned-records scan, against a fake client. Ported from miso-app's
// `src/lib/records.test.ts` — the logic moved here, so its coverage did too.

import { describe, expect, test } from "bun:test";
import { getOwnedRecords, RECORD_TYPE_SUFFIX } from "../../src/read/wallet.ts";
import type { MisoClient } from "../../src/read/client.ts";

type Obj = { objectId: string; type: string; json?: Record<string, unknown> | null };
type Page = { objects: Obj[]; hasNextPage: boolean; cursor: string | null };

/** A client whose `listOwnedObjects` serves the given pages in order. */
function fakeClient(pages: Page[]): { client: MisoClient; calls: number } {
  const state = { calls: 0 };
  const client = {
    protocol: {
      core: {
        listOwnedObjects: async () => {
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
  };
}

const RECORD_TYPE = `0xfc2b51f068dee9d5482d39fa017164f6a8c3601cabb59084a518de5f609ef1c7${RECORD_TYPE_SUFFIX}`;
const OTHER_RECORD_PACKAGE = `0x79e288aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa${RECORD_TYPE_SUFFIX}`;

describe("getOwnedRecords", () => {
  test("matches records from BOTH live packages by type suffix", async () => {
    const { client } = fakeClient([
      {
        objects: [
          { objectId: "0x1", type: RECORD_TYPE, json: { release_id: "0xrel", number: 3 } },
          { objectId: "0x2", type: OTHER_RECORD_PACKAGE, json: { release_id: "0xrel", number: 4 } },
        ],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const records = await getOwnedRecords(client, "0xowner");
    expect(records.map((r) => r.id)).toEqual(["0x1", "0x2"]);
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

  test("reads the copy number from both struct layouts", async () => {
    const { client } = fakeClient([
      {
        objects: [
          // Card-checkout layout.
          { objectId: "0x1", type: RECORD_TYPE, json: { release_id: "0xa", number: 7 } },
          // SDK-view layout: the number is nested in the variant enum.
          {
            objectId: "0x2",
            type: RECORD_TYPE,
            json: { release_id: "0xb", edition: 2, variant: { Production: { number: 12 } } },
          },
        ],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const records = await getOwnedRecords(client, "0xowner");
    expect(records[0]!.number).toBe(7);
    // The COPY number (12), not the edition (2) — see readRecordNumber's note.
    expect(records[1]!.number).toBe(12);
  });

  test("falls back to edition only when no copy number is carried", async () => {
    const { client } = fakeClient([
      {
        objects: [{ objectId: "0x1", type: RECORD_TYPE, json: { release_id: "0xa", edition: 5 } }],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const [record] = await getOwnedRecords(client, "0xowner");
    expect(record!.number).toBe(5);
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
