// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { deriveSaleIds } from "../../src/pressing.ts";
import * as listing from "../../src/contracts/miso_pressing/listing.ts";
import * as pressing from "../../src/contracts/miso_pressing/pressing.ts";
import {
  getListingView,
  getPressingView,
} from "../../src/read/catalog.ts";
import type { MisoClient } from "../../src/read/client.ts";

const RELEASE = `0x${"33".repeat(32)}`;
const CURRENCY = "0x2::sui::SUI";
const PACKAGE = "0xa";
const { pressingId: PRESSING, listingId: LISTING } = deriveSaleIds(
  RELEASE,
  CURRENCY,
  PACKAGE,
);

const pressingBytes = pressing.Pressing.serialize({
  id: PRESSING,
  release_id: RELEASE,
  state: { Scheduled: { start_timestamp_ms: "1234" } },
  supply: "7",
}).toBytes();

const listingBytes = listing.Listing.serialize({
  id: LISTING,
  release_id: RELEASE,
  pressing_id: PRESSING,
  price: { Floor: { amount: "2500" } },
  state: { Enabled: true },
}).toBytes();

function fixtureClient(): MisoClient {
  const protocol = {
    core: {
      getObject: async ({ objectId }: { objectId: string }) => ({
        object:
          objectId === PRESSING
            ? { content: pressingBytes, type: `${PACKAGE}::pressing::Pressing` }
            : objectId === LISTING
              ? {
                  content: listingBytes,
                  type: `${PACKAGE}::listing::Listing<${CURRENCY}>`,
                }
              : undefined,
      }),
    },
  } as unknown as ClientWithCoreApi;

  return {
    config: { protocol: { pressing: PACKAGE } },
    protocol,
  } as unknown as MisoClient;
}

test("projects an atomic pressing to JSON-safe values", async () => {
  const view = await getPressingView(fixtureClient(), PRESSING);
  expect(view).toMatchObject({
    id: PRESSING,
    releaseId: RELEASE,
    state: { kind: "scheduled", startTimestampMs: 1234 },
    supply: "7",
  });
  expect(() => JSON.stringify(view)).not.toThrow();
});

test("projects a derived listing to JSON-safe values", async () => {
  const view = await getListingView(fixtureClient(), PRESSING, CURRENCY);
  expect(view).toMatchObject({
    id: LISTING,
    pressingId: PRESSING,
    releaseId: RELEASE,
    price: { kind: "floor", amount: "2500" },
    currency: { symbol: "SUI", decimals: 9 },
    state: "enabled",
  });
  expect(() => JSON.stringify(view)).not.toThrow();
});
