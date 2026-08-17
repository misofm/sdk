// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Drop — the record sale. A `Drop<Currency>` is a shared, immutable object that sells
// copies of a Release's records at a fixed or floor price, optionally capped
// (`maxSupply`) and/or time-boxed. A release has at most ONE live drop: `createDrop`
// opens edition 0, and `newEdition` opens edition n+1 by consuming the predecessor —
// the one way to change price, currency, cap, or window. The registry tracks each
// release's live drop (`getCurrentDrop`).

import type { ClientWithCoreApi } from "@mysten/sui/client";
import { deriveDynamicFieldID } from "@mysten/sui/utils";
import { bcs } from "@mysten/sui/bcs";
import type { TxThunk } from "./transactions.ts";
import { isNotFound } from "./queries.ts";
import * as drop from "./contracts/miso_drop/drop.ts";

/** Pricing policy: pay exactly `amount` (fixed) or at least `amount` (floor). */
export type DropPrice = { kind: "fixed" | "floor"; amount: bigint | number | string };

export interface CreateDropParams {
  /** The `Release` object the drop sells copies of — also the drop's derivation
   *  parent and the home of the live-drop pointer. */
  releaseId: string;
  /** The release's `ReleaseAdminCap` — authorizes the drop. */
  releaseAdminCapId: string;
  /** Fixed or floor price, in the currency's smallest unit. */
  price: DropPrice;
  /** The `Currency` type argument, e.g. `0x2::sui::SUI`. */
  currencyType: string;
  /** Copies this edition may ever sell; `null`/omitted = uncapped (an open edition). */
  maxSupply?: bigint | number | null;
  /** Unix ms the sale opens. Default 0 (open immediately). */
  startTimestampMs?: bigint | number;
  /** Unix ms the sale closes; `null`/omitted = evergreen. */
  endTimestampMs?: bigint | number | null;
  misoDropPackageId: string;
}

/**
 * Creates and shares a release's FIRST drop — edition 0. A release's edition
 * sequence can only ever start once; later terms changes go through `newEdition`.
 * The `Clock` is auto-supplied by the generated binding.
 */
export function createDrop(p: CreateDropParams): TxThunk {
  return (tx) => {
    const terms = buildTerms(tx, p);
    tx.add(
      drop._new({
        package: p.misoDropPackageId,
        arguments: [p.releaseId, p.releaseAdminCapId, terms.price, terms.supply, terms.window],
        typeArguments: [p.currencyType],
      }),
    );
  };
}

export interface NewEditionParams {
  /** The `Release` whose drop is being superseded. */
  releaseId: string;
  /** The release's CURRENT drop — consumed (destroyed) by this call. */
  oldDropId: string;
  /** The current drop's `Currency` type. */
  oldCurrencyType: string;
  /** The release's `ReleaseAdminCap`. */
  releaseAdminCapId: string;
  /** The successor's price. */
  price: DropPrice;
  /** The successor's `Currency` type (may differ from the old one). */
  currencyType: string;
  /** Successor's supply cap; `null`/omitted = uncapped. */
  maxSupply?: bigint | number | null;
  /** Unix ms the successor opens. Default 0 (open immediately). */
  startTimestampMs?: bigint | number;
  /** Unix ms the successor closes; `null`/omitted = evergreen. */
  endTimestampMs?: bigint | number | null;
  misoDropPackageId: string;
}

/**
 * Opens edition n+1 of a release's drop, CONSUMING the current one — the one way to
 * change price, currency, cap, or window (or start a fresh run after a sell-out).
 * Serial numbers restart at 1 for the new edition. The `Clock` is auto-supplied.
 */
export function newEdition(p: NewEditionParams): TxThunk {
  return (tx) => {
    const terms = buildTerms(tx, p);
    tx.add(
      drop.newEdition({
        package: p.misoDropPackageId,
        arguments: [p.releaseId, p.oldDropId, p.releaseAdminCapId, terms.price, terms.supply, terms.window],
        typeArguments: [p.oldCurrencyType, p.currencyType],
      }),
    );
  };
}

/** Builds the three on-chain term values (`Price`, `Supply`, `Window`) from the flat
 *  facade params — the flat shape stays the public API; the enums are a wire detail. */
function buildTerms(
  tx: Parameters<TxThunk>[0],
  p: Pick<CreateDropParams, "price" | "maxSupply" | "startTimestampMs" | "endTimestampMs" | "misoDropPackageId">,
) {
  const pkg = { package: p.misoDropPackageId };
  const makePrice = p.price.kind === "fixed" ? drop.newFixedPrice : drop.newFloorPrice;
  const price = tx.add(makePrice({ ...pkg, arguments: [BigInt(p.price.amount)] }));
  const supply =
    p.maxSupply == null
      ? tx.add(drop.newUncappedSupply({ ...pkg, arguments: [] }))
      : tx.add(drop.newCappedSupply({ ...pkg, arguments: [BigInt(p.maxSupply)] }));
  const start = BigInt(p.startTimestampMs ?? 0);
  const window =
    p.endTimestampMs == null
      ? tx.add(drop.newUnboundedWindow({ ...pkg, arguments: [start] }))
      : tx.add(drop.newBoundedWindow({ ...pkg, arguments: [start, BigInt(p.endTimestampMs)] }));
  return { price, supply, window };
}

export interface BuyRecordParams {
  /** The shared `Drop<Currency>` to buy from. */
  dropId: string;
  /** Buyer's `Coin<Currency>` object ids to pay from — merged, then split to `amount`. */
  paymentCoinIds: string[];
  /** Amount to pay in the currency's smallest unit (exact for `fixed`, ≥ for `floor`). */
  amount: bigint | number | string;
  /** The drop's `Currency` type, e.g. `0x2::sui::SUI`. */
  currencyType: string;
  /** The `miso_record` `Settings` shared object (authorizes the mint). */
  settingsId: string;
  /** Where to send the bought `Record` (usually the buyer). */
  recipient: string;
  misoDropPackageId: string;
}

/**
 * Buys one record from a drop: merges the buyer's payment coins, splits the exact
 * price, calls `buy`, and sends the minted `Record` to `recipient`. The buyer selects
 * which of their coins to spend (see the app's coin selection); this builder only
 * assembles the PTB. The `Clock` is auto-supplied.
 */
export function buyRecord(p: BuyRecordParams): TxThunk {
  return (tx) => {
    const [first, ...rest] = p.paymentCoinIds;
    if (!first) throw new Error("buyRecord: no payment coins provided");
    const primary = tx.object(first);
    if (rest.length > 0) tx.mergeCoins(primary, rest.map((id) => tx.object(id)));
    const [payment] = tx.splitCoins(primary, [tx.pure.u64(BigInt(p.amount))]);
    const record = tx.add(
      drop.buy({
        package: p.misoDropPackageId,
        arguments: [p.dropId, payment, p.settingsId],
        typeArguments: [p.currencyType],
      }),
    );
    tx.transferObjects([record], p.recipient);
  };
}

/** A parsed drop, in the shape the featured-drop card renders. */
export interface DropView {
  id: string;
  releaseId: string;
  edition: number;
  price: { kind: "fixed" | "floor"; amount: bigint };
  /** `null` = uncapped (an open edition). */
  maxSupply: bigint | null;
  quantitySold: bigint;
  startTimestampMs: bigint;
  /** `null` = evergreen. */
  endTimestampMs: bigint | null;
  /** The drop's `Currency` type, parsed from its object type tag (`null` if unavailable). */
  currencyType: string | null;
}

/** Extracts `CURRENCY` from a `…::drop::Drop<CURRENCY>` type tag. */
function currencyFromType(type: string | null | undefined): string | null {
  if (!type) return null;
  const lt = type.indexOf("<");
  return lt >= 0 && type.endsWith(">") ? type.slice(lt + 1, -1) : null;
}

/**
 * Fetches and parses a shared `Drop` object, or `null` if it doesn't exist.
 *
 * NOTE: this deliberately deviates from the core-getter convention in
 * `./queries.ts` (throw on missing object). Consumers probe pasted or stored
 * drop ids — a party's featured drop, a superseded edition — where "no such
 * drop" is a normal state, so absence is `null` and only transport failures throw.
 */
export async function getDrop(client: ClientWithCoreApi, dropId: string): Promise<DropView | null> {
  let content: Uint8Array | null | undefined;
  let type: string | undefined;
  try {
    const { object } = await client.core.getObject({ objectId: dropId, include: { content: true } });
    content = object?.content;
    type = object?.type;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
  if (!content) return null;

  const d = drop.Drop.parse(content);
  const price = d.price as { $kind?: string; Fixed?: { amount: string }; Floor?: { amount: string } };
  const isFixed = price.$kind === "Fixed" || price.Fixed != null;
  const amount = (isFixed ? price.Fixed?.amount : price.Floor?.amount) ?? "0";
  const supply = d.supply as { $kind?: string; Capped?: { max: string } };
  const capped = supply.$kind === "Capped" || supply.Capped != null;
  const window = d.window as {
    $kind?: string;
    Unbounded?: { start_timestamp_ms: string };
    Bounded?: { start_timestamp_ms: string; end_timestamp_ms: string };
  };
  const bounded = window.$kind === "Bounded" || window.Bounded != null;

  return {
    id: dropId,
    releaseId: d.release_id,
    edition: d.edition,
    price: { kind: isFixed ? "fixed" : "floor", amount: BigInt(amount) },
    maxSupply: capped ? BigInt(supply.Capped?.max ?? "0") : null,
    quantitySold: BigInt(d.quantity_sold),
    startTimestampMs: BigInt(
      (bounded ? window.Bounded?.start_timestamp_ms : window.Unbounded?.start_timestamp_ms) ?? "0",
    ),
    endTimestampMs: bounded ? BigInt(window.Bounded?.end_timestamp_ms ?? "0") : null,
    currencyType: currencyFromType(type),
  };
}

// The release's `CurrentDropKey` dynamic field holds a bare `ID`; the field object
// serializes as `Field { id, name: CurrentDropKey (unit), value: ID }`.
const CurrentDropField = bcs.struct("Field", { id: bcs.Address, name: bcs.bool(), value: bcs.Address });

// Unit-struct key bytes (single `0x00` for the dummy bool field).
const CURRENT_DROP_KEY_BYTES = drop.CurrentDropKey.serialize([false]).toBytes();

export interface GetCurrentDropParams {
  /** The release whose live drop to resolve. */
  releaseId: string;
  misoDropPackageId: string;
}

/**
 * Resolves a release's LIVE drop through the `CurrentDropKey` pointer on the
 * release's UID, or `null` if the release has never dropped. Superseded drops are
 * destroyed, so this — not derived-address probing — is how the current edition is
 * found.
 */
export async function getCurrentDrop(client: ClientWithCoreApi, p: GetCurrentDropParams): Promise<DropView | null> {
  const fieldId = deriveDynamicFieldID(
    p.releaseId,
    `${p.misoDropPackageId}::drop::CurrentDropKey`,
    CURRENT_DROP_KEY_BYTES,
  );
  let content: Uint8Array | null | undefined;
  try {
    const { object } = await client.core.getObject({ objectId: fieldId, include: { content: true } });
    content = object?.content;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
  if (!content) return null;
  return getDrop(client, CurrentDropField.parse(content).value);
}
