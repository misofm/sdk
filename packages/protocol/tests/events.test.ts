// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { eventParsers } from "../src/events.ts";
import { ReleaseRegistryCreatedEvent } from "../src/contracts/miso/release.ts";
import { DescriptionSetEvent } from "../src/contracts/release_description/release_description.ts";
import { RoyaltyClaimedEvent } from "../src/contracts/royalty_pool/pool.ts";
import { RoutedStakeSweptEvent } from "../src/contracts/routed_stake/routed_stake.ts";

const A = "0x" + "12".repeat(32);
const B = "0x" + "34".repeat(32);

test("extension event decoders preserve current generated BCS fields", () => {
  const bytes = DescriptionSetEvent.serialize({
    release_id: A,
    description: "Liner notes",
  }).toBytes();

  expect(eventParsers.extensions.releaseDescription.descriptionSet(bytes)).toEqual({
    release_id: A,
    description: "Liner notes",
  });
});

test("core-registry and primitive event decoders round-trip the current ABI", () => {
  const registry = ReleaseRegistryCreatedEvent.serialize({
    registry_id: A,
    created_by: B,
  }).toBytes();
  const claimed = RoyaltyClaimedEvent.serialize({
    pool_id: A,
    stake_id: B,
    reward_amount: "42",
  }).toBytes();
  const swept = RoutedStakeSweptEvent.serialize({
    routed_stake_id: A,
    parent_id: B,
    value: "99",
  }).toBytes();

  expect(eventParsers.core.releaseRegistryCreated(registry)).toEqual({
    registry_id: A,
    created_by: B,
  });
  expect(eventParsers.primitives.royaltyPool.royaltyClaimed(claimed)).toEqual({
    pool_id: A,
    stake_id: B,
    reward_amount: "42",
  });
  expect(eventParsers.primitives.routedStake.swept(swept)).toEqual({
    routed_stake_id: A,
    parent_id: B,
    value: "99",
  });
});
