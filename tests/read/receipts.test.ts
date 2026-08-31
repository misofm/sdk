// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "bun:test";
import * as listing from "../../src/contracts/miso_pressing/listing.ts";
import {
  findRecordSale,
  isRecordSoldEventType,
} from "../../src/read/receipts.ts";

const PRESSING_PACKAGE = "0xa";
const CURRENCY = "0x2::sui::SUI";
const IDS = {
  listing: "0x" + "11".repeat(32),
  pressing: "0x" + "22".repeat(32),
  release: "0x" + "33".repeat(32),
  record: "0x" + "44".repeat(32),
  buyer: "0x" + "55".repeat(32),
};

function eventType(packageId: string): string {
  return `${packageId}::listing::RecordSoldEvent<${CURRENCY}>`;
}

function bcsEvent(price: { Fixed: { amount: string } } | { Floor: { amount: string } }) {
  return listing.RecordSoldEvent.serialize({
    listing_id: IDS.listing,
    pressing_id: IDS.pressing,
    release_id: IDS.release,
    record_id: IDS.record,
    number: "7",
    price,
    paid: "2500",
    buyer: IDS.buyer,
    created_at_ms: "1234",
  }).toBytes();
}

describe("record sale event identity", () => {
  test("requires this pressing package, listing module, struct, and one currency", () => {
    expect(isRecordSoldEventType(eventType("0xa"), PRESSING_PACKAGE)).toBe(true);
    expect(isRecordSoldEventType(eventType("0xb"), PRESSING_PACKAGE)).toBe(false);
    expect(
      isRecordSoldEventType(
        "0xa::listing::RecordSoldEvent<0x2::sui::SUI, 0x2::sui::SUI>",
        PRESSING_PACKAGE,
      ),
    ).toBe(false);
    expect(
      isRecordSoldEventType(
        "0xa::other::RecordSoldEvent<0x2::sui::SUI>",
        PRESSING_PACKAGE,
      ),
    ).toBe(false);
  });

  test("skips an earlier compatible spoof and decodes the current BCS Floor price", () => {
    const sale = findRecordSale(
      [
        {
          eventType: eventType("0xb"),
          bcs: bcsEvent({ Fixed: { amount: "999" } }),
          json: null,
        },
        {
          eventType: eventType("0xa"),
          bcs: bcsEvent({ Floor: { amount: "2500" } }),
          json: null,
        },
      ],
      PRESSING_PACKAGE,
    );
    expect(sale).toMatchObject({
      pressingId: IDS.pressing,
      price: { kind: "floor", amount: "2500" },
      currencyType: "0x" + "0".repeat(63) + "2::sui::SUI",
      createdAtMs: 1234,
    });
  });

  test("decodes BCS Fixed and JSON floor Price variants", () => {
    const fixed = findRecordSale(
      [{ eventType: eventType("0xa"), bcs: bcsEvent({ Fixed: { amount: "99" } }), json: null }],
      PRESSING_PACKAGE,
    );
    expect(fixed?.price).toEqual({ kind: "fixed", amount: "99" });

    const floor = findRecordSale(
      [
        {
          eventType: eventType("0xa"),
          bcs: new Uint8Array(),
          json: {
            listing_id: IDS.listing,
            pressing_id: IDS.pressing,
            release_id: IDS.release,
            record_id: IDS.record,
            number: "7",
            price: { floor: { amount: "123" } },
            paid: "123",
            buyer: IDS.buyer,
            created_at_ms: "5678",
          },
        },
      ],
      PRESSING_PACKAGE,
    );
    expect(floor?.price).toEqual({ kind: "floor", amount: "123" });
    expect(floor?.createdAtMs).toBe(5678);
  });
});
