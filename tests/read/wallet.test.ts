// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// The owned-records scan, against a fake client. Ported from miso-app's
// `src/lib/records.test.ts` — the logic moved here, so its coverage did too.

import { describe, expect, test } from "bun:test";
import { getBalance, getOwnedRecords } from "../../src/read/wallet.ts";
import type { MisoClient } from "../../src/read/client.ts";

type Obj = { objectId: string; type: string; json?: Record<string, unknown> | null };
type Page = { objects: Obj[]; hasNextPage: boolean; cursor: string | null };

/** A client whose `listOwnedObjects` serves the given pages in order. */
const RECORD_PACKAGE = "0x" + "ab".repeat(32);
const PRESSING_PACKAGE = "0x" + "ef".repeat(32);
const WRONG_RECORD_PACKAGE = "0x" + "cd".repeat(32);
const CERTIFICATE_TYPE = `${PRESSING_PACKAGE}::certificate::Certificate`;
const RECORD_TYPE_FILTER = `${RECORD_PACKAGE}::record::Record`;
const RECORD_TYPE = RECORD_TYPE_FILTER;
const WRONG_RECORD_TYPE = `${WRONG_RECORD_PACKAGE}::record::Record`;

function fakeClient(pages: Page[]): { client: MisoClient; calls: number; types: string[] } {
  const state = { calls: 0, types: [] as string[] };
  const client = {
    config: { protocol: { record: RECORD_PACKAGE, pressing: PRESSING_PACKAGE } },
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
          {
            objectId: "0x1",
            type: RECORD_TYPE,
            json: {
              release_id: "0xrel",
              registry_id: "0xregistry",
              number: "18446744073709551615",
              created_at_ms: "1234",
              purchase_currency: { name: "0x2::sui::SUI" },
              purchased_by: "0xbuyer",
            },
          },
          { objectId: "0x2", type: WRONG_RECORD_TYPE, json: { release_id: "0xrel", number: 4 } },
        ],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const records = await getOwnedRecords(fake.client, "0xowner");
    expect(records).toEqual([{
      id: "0x1",
      type: RECORD_TYPE,
      releaseId: "0xrel",
      registryId: "0xregistry",
      number: "18446744073709551615",
      createdAtMs: 1234,
      purchaseCurrency: "0x2::sui::SUI",
      purchasedBy: "0xbuyer",
    }]);
    expect(fake.types).toEqual([RECORD_TYPE_FILTER]);
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

  test("does not infer Pressing provenance from stale embedded fields", async () => {
    const { client } = fakeClient([
      {
        objects: [
          {
            objectId: "0x1",
            type: RECORD_TYPE,
            json: { release_id: "0xa", certificate: { number: "7" } },
          },
        ],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const records = await getOwnedRecords(client, "0xowner");
    expect(records[0]!.number).toBeNull();
  });

  test("rejects non-canonical generic Record specializations", async () => {
    const arbitraryCertificate = `0x${"12".repeat(32)}::certificate::Certificate`;
    const { client } = fakeClient([
      {
        objects: [
          { objectId: "0xtrusted", type: RECORD_TYPE, json: { release_id: "0xa" } },
          {
            objectId: "0xarbitrary",
            type: `${RECORD_TYPE_FILTER}<${arbitraryCertificate}>`,
            json: { release_id: "0xb", certificate: { number: 2 } },
          },
          {
            objectId: "0xmalformed",
            type: `${RECORD_TYPE_FILTER}<${CERTIFICATE_TYPE}, ${CERTIFICATE_TYPE}>`,
            json: { release_id: "0xc", certificate: { number: 3 } },
          },
        ],
        hasNextPage: false,
        cursor: null,
      },
    ]);

    const records = await getOwnedRecords(client, "0xowner");
    expect(records.map((item) => item.id)).toEqual(["0xtrusted"]);
  });

  test("reads the Registry-allocated top-level number field", async () => {
    const { client } = fakeClient([
      {
        objects: [{ objectId: "0x1", type: RECORD_TYPE, json: { release_id: "0xa", number: 7 } }],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const records = await getOwnedRecords(client, "0xowner");
    expect(records[0]!.number).toBe("7");
  });

  test("fails malformed and unsafe provenance fields closed", async () => {
    const { client } = fakeClient([
      {
        objects: [{
          objectId: "0x1",
          type: RECORD_TYPE,
          json: {
            release_id: "",
            registry_id: 7,
            number: Number.MAX_SAFE_INTEGER + 1,
            created_at_ms: "18446744073709551615",
            purchase_currency: { name: 9 },
            purchased_by: null,
          },
        }],
        hasNextPage: false,
        cursor: null,
      },
    ]);
    const [record] = await getOwnedRecords(client, "0xowner");
    expect(record).toMatchObject({
      releaseId: null,
      registryId: null,
      number: null,
      createdAtMs: null,
      purchaseCurrency: null,
      purchasedBy: null,
    });
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

  test("a record with no parsable fields is still listed", async () => {
    const { client } = fakeClient([
      { objects: [{ objectId: "0x1", type: RECORD_TYPE, json: null }], hasNextPage: false, cursor: null },
    ]);
    const [record] = await getOwnedRecords(client, "0xowner");
    expect(record).toEqual({
      id: "0x1",
      type: RECORD_TYPE,
      releaseId: null,
      registryId: null,
      number: null,
      createdAtMs: null,
      purchaseCurrency: null,
      purchasedBy: null,
    });
  });
});

describe("getBalance", () => {
  test("preserves storage breakdown and resolves decimals from cached chain metadata", async () => {
    const balanceCalls: Array<{ owner: string; coinType: string }> = [];
    const metadataCalls: string[] = [];
    const client = {
      config: { money: { usdCoinType: "0x2::usd::USD", usdDecimals: 99 } },
      protocol: {
        core: {
          getBalance: async ({ owner, coinType }: { owner: string; coinType: string }) => {
            balanceCalls.push({ owner, coinType });
            return {
              balance: {
                coinType,
                balance: "90000000",
                coinBalance: "55000000",
                addressBalance: "35000000",
              },
            };
          },
          getCoinMetadata: async ({ coinType }: { coinType: string }) => {
            metadataCalls.push(coinType);
            return {
              coinMetadata: {
                id: "0xmetadata",
                decimals: 6,
                name: "USD",
                symbol: "USD",
                description: "",
                iconUrl: null,
              },
            };
          },
        },
      },
    } as unknown as MisoClient;

    const expected = {
      address: `0x${"0".repeat(63)}1`,
      coinType: "0x2::usd::USD",
      balance: "90000000",
      coinBalance: "55000000",
      addressBalance: "35000000",
      decimals: 6,
    };
    await expect(getBalance(client, "0x1")).resolves.toEqual(expected);
    await expect(getBalance(client, "0x1")).resolves.toEqual(expected);
    expect(balanceCalls).toEqual([
      { owner: "0x1", coinType: "0x2::usd::USD" },
      { owner: "0x1", coinType: "0x2::usd::USD" },
    ]);
    expect(metadataCalls).toEqual([`0x${"0".repeat(63)}2::usd::USD`]);
  });

  test("fails closed when coin metadata is unavailable", async () => {
    const client = {
      config: { money: { usdCoinType: "0x2::usd::USD", usdDecimals: 99 } },
      protocol: {
        core: {
          getBalance: async () => ({
            balance: {
              coinType: "0x2::usd::USD",
              balance: "0",
              coinBalance: "0",
              addressBalance: "0",
            },
          }),
          getCoinMetadata: async () => ({ coinMetadata: null }),
        },
      },
    } as unknown as MisoClient;

    await expect(getBalance(client, "0x1")).rejects.toThrow(/decimal precision/);
  });
});
