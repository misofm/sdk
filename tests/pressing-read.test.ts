// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
  deriveSaleIds,
  getListing,
  getPressing,
  getSale,
  buyRecord,
  openPressing,
  setPressingState,
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
  await expect(getPressing(client, PRESSING, "0xa")).resolves.toMatchObject({
    id: PRESSING,
    releaseId: RELEASE,
    state: { kind: "scheduled", startTimestampMs: 1234n },
    supply: 7n,
  });
  await expect(getListing(client, LISTING, "0xa")).resolves.toMatchObject({
    id: LISTING,
    releaseId: RELEASE,
    pressingId: PRESSING,
    price: { kind: "floor", amount: 2500n },
    state: "enabled",
    currencyType: "0x" + "0".repeat(63) + "2::sui::SUI",
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

test("rejects same-shaped Pressing and Listing bytes from a different configured package", async () => {
  const wrongPackage = "0xb";
  const client = {
    core: {
      getObject: async ({ objectId }: { objectId: string }) => ({
        object:
          objectId === PRESSING
            ? { content: pressingBytes, type: `${wrongPackage}::pressing::Pressing` }
            : { content: listingBytes, type: `${wrongPackage}::listing::Listing<${CURRENCY}>` },
      }),
    },
  } as unknown as ClientWithCoreApi;

  await expect(getPressing(client, PRESSING, "0xa")).rejects.toThrow("configured");
  await expect(getListing(client, LISTING, "0xa")).rejects.toThrow("configured");
});

test("getSale rejects same-shaped batch objects from a different configured package", async () => {
  const client = {
    core: {
      getObjects: async () => ({
        objects: [
          { content: pressingBytes, type: "0xb::pressing::Pressing" },
          { content: listingBytes, type: `0xb::listing::Listing<${CURRENCY}>` },
        ],
      }),
    },
  } as unknown as ClientWithCoreApi;

  await expect(
    getSale(client, {
      releaseId: RELEASE,
      currencyType: CURRENCY,
      misoPressingPackageId: "0xa",
    }),
  ).rejects.toThrow("configured");
});

test("rejects a correct outer type when BCS identity or derivation is inconsistent", async () => {
  const other = "0x" + "44".repeat(32);
  const malformedPressing = pressing.Pressing.serialize({
    id: PRESSING,
    release_id: other,
    state: { Active: true },
    supply: "0",
  }).toBytes();
  const malformedListing = listing.Listing.serialize({
    id: LISTING,
    release_id: RELEASE,
    pressing_id: other,
    price: { Fixed: { amount: "1" } },
    state: { Enabled: true },
  }).toBytes();
  const client = {
    core: {
      getObject: async ({ objectId }: { objectId: string }) => ({
        object:
          objectId === PRESSING
            ? { content: malformedPressing, type: "0xa::pressing::Pressing" }
            : { content: malformedListing, type: `0xa::listing::Listing<${CURRENCY}>` },
      }),
    },
  } as unknown as ClientWithCoreApi;

  await expect(getPressing(client, PRESSING, "0xa")).rejects.toThrow("derived id");
  await expect(getListing(client, LISTING, "0xa")).rejects.toThrow("Listing pressing");
});

test("rejects a Listing whose generic Currency does not derive the requested listing id", async () => {
  const client = {
    core: {
      getObject: async () => ({
        object: { content: listingBytes, type: "0xa::listing::Listing<0x2::foo::FAKE>" },
      }),
    },
  } as unknown as ClientWithCoreApi;

  await expect(getListing(client, LISTING, "0xa")).rejects.toThrow("Listing derived id");
});

test("rejects unsafe JavaScript numbers before serializing u64 price, schedule, and payment", () => {
  const unsafe = Number.MAX_SAFE_INTEGER + 2;
  expect(() =>
    openPressing({
      releaseId: RELEASE,
      releaseAdminCapId: PRESSING,
      adminCapRecipient: PRESSING,
      misoPressingPackageId: "0xa",
      listings: [{ currencyType: CURRENCY, price: { kind: "fixed", amount: unsafe } }],
    })(new Transaction()),
  ).toThrow("safe integer");
  expect(() =>
    setPressingState({
      releaseId: RELEASE,
      pressingAdminCapId: PRESSING,
      misoPressingPackageId: "0xa",
      state: { kind: "scheduled", startTimestampMs: unsafe },
    })(new Transaction()),
  ).toThrow("safe integer");
  expect(() =>
    buyRecord({
      releaseId: RELEASE,
      currencyType: CURRENCY,
      settingsId: PRESSING,
      recipient: PRESSING,
      misoPressingPackageId: "0xa",
      amount: unsafe,
    })(new Transaction()),
  ).toThrow("safe integer");
  expect(() =>
    openPressing({
      releaseId: RELEASE,
      releaseAdminCapId: PRESSING,
      adminCapRecipient: PRESSING,
      misoPressingPackageId: "0xa",
      listings: [{ currencyType: CURRENCY, price: { kind: "fixed", amount: "9007199254740993" } }],
    })(new Transaction()),
  ).not.toThrow();
});
