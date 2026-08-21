// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import {
  deriveSaleIds,
  getListing,
  getPressing,
  getSale,
} from "../src/pressing.ts";
import * as listing from "../src/contracts/miso_pressing/listing.ts";
import * as pressing from "../src/contracts/miso_pressing/pressing.ts";

const RELEASE = "0x" + "33".repeat(32);
const CURRENCY = "0x2::sui::SUI";
const { pressingId: PRESSING, listingId: LISTING } = deriveSaleIds(
  RELEASE,
  CURRENCY,
  "0xa",
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

function fixtureClient(): ClientWithCoreApi {
  return {
    core: {
      getObject: async ({ objectId }: { objectId: string }) => ({
        object:
          objectId === PRESSING
            ? { content: pressingBytes, type: "0xa::pressing::Pressing" }
            : objectId === LISTING
              ? { content: listingBytes, type: `0xa::listing::Listing<${CURRENCY}>` }
              : undefined,
      }),
      getObjects: async ({ objectIds }: { objectIds: string[] }) => ({
        objects: objectIds.map((objectId) =>
          objectId === PRESSING
            ? { objectId, content: pressingBytes, type: "0xa::pressing::Pressing" }
            : objectId === LISTING
              ? { objectId, content: listingBytes, type: `0xa::listing::Listing<${CURRENCY}>` }
              : new Error("not found"),
        ),
      }),
    },
  } as unknown as ClientWithCoreApi;
}

test("reads populated current Pressing and Listing fixtures", async () => {
  const client = fixtureClient();
  await expect(getPressing(client, PRESSING)).resolves.toMatchObject({
    id: PRESSING,
    releaseId: RELEASE,
    state: { kind: "scheduled", startTimestampMs: 1234n },
    supply: 7n,
  });
  await expect(getListing(client, LISTING)).resolves.toMatchObject({
    id: LISTING,
    releaseId: RELEASE,
    pressingId: PRESSING,
    price: { kind: "floor", amount: 2500n },
    state: "enabled",
    currencyType: CURRENCY,
  });
});

test("resolves a populated sale from the derived Pressing and Listing slots", async () => {
  const sale = await getSale(fixtureClient(), {
    releaseId: RELEASE,
    currencyType: CURRENCY,
    misoPressingPackageId: "0xa",
  });
  // The fixture client responds by requested slot; the important assertion here is
  // that the current ABI parses both object shapes in one Core batch.
  expect(sale.pressing?.supply).toBe(7n);
  expect(sale.listing?.price).toEqual({ kind: "floor", amount: 2500n });
});

test("propagates a non-not-found error from either derived sale slot", async () => {
  const unavailable = new Error("gRPC transport unavailable");
  const notFound = new Error("Object 0x1 not found");
  for (const objects of [[unavailable, notFound], [notFound, unavailable]]) {
    const client = {
      core: {
        getObjects: async () => ({ objects }),
      },
    } as unknown as ClientWithCoreApi;

    await expect(
      getSale(client, {
        releaseId: RELEASE,
        currencyType: CURRENCY,
        misoPressingPackageId: "0xa",
      }),
    ).rejects.toThrow("gRPC transport unavailable");
  }
});
