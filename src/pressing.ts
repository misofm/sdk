// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Pressing — the record production line. A release has exactly ONE `Pressing`: a
// single uncapped run whose counter numbers every copy that release will ever sell,
// forever. There are no editions, no supply caps, no sold-out state, and no expiry —
// the run is `Scheduled → Active → Paused → Active` and nothing else. Selling in a
// currency is a `Listing<Currency>` derived off the pressing: one per currency, ever,
// permanent, edited in place rather than replaced. A sale needs both switches open.
//
// EVERYTHING IS ADDRESS MATH. The pressing's UID derives off its release's, each
// listing's off the pressing's. So there is no registry and no pointer to follow:
// `derivePressingId`/`deriveListingId` answer "where is it" offline, which is why the
// builders here take a RELEASE id and compute the rest. A caller cannot pass a
// listing that belongs to some other pressing, because it never picks one.

import type { ClientWithCoreApi } from "@mysten/sui/client";
import { deriveObjectID, normalizeStructTag } from "@mysten/sui/utils";
import type { TxThunk } from "./transactions.ts";
import { isNotFound } from "./queries.ts";
import * as listing from "./contracts/miso_pressing/listing.ts";
import * as pressing from "./contracts/miso_pressing/pressing.ts";

/** Pricing policy: pay exactly `amount` (fixed) or at least `amount` (floor). */
export type ListingPrice = { kind: "fixed" | "floor"; amount: bigint | number | string };

/** Whether a currency's listing takes payment. Below the pressing's own run state. */
export type ListingSwitch = "enabled" | "disabled";

/**
 * The run's state, across every currency at once.
 *
 * `scheduled` is transitional: the first sale past `startTimestampMs` rewrites it to
 * `active` inside `mint_next`, and the start time leaves the object with it. "When was
 * this run scheduled for" is an event-log question once a run has sold anything.
 */
export type PressingRunState =
  | { kind: "scheduled"; startTimestampMs: bigint | number }
  | { kind: "active" }
  | { kind: "paused" };

// ============================================================================
// Address math
// ============================================================================

/** Key bytes for Move unit structs (single `0x00` for `dummy_field: bool = false`). */
const UNIT_STRUCT_KEY_BYTES = new Uint8Array([0x00]);

/**
 * Where `releaseId`'s pressing lives — computable before it has been opened, and
 * stable forever after, because a release can only ever claim one.
 *
 * `misoPressingPackageId` must be the package's ORIGINAL (first-published) id, since
 * that is the address a Move type tag canonicalises to. `miso_pressing` is published
 * immutable, so its original and current ids are the same.
 */
export function derivePressingId(releaseId: string, misoPressingPackageId: string): string {
  return deriveObjectID(releaseId, `${misoPressingPackageId}::pressing::PressingKey`, UNIT_STRUCT_KEY_BYTES);
}

/**
 * Where `pressingId`'s admin cap was minted. The cap is transferable, so this is not
 * where it lives — only where it came from.
 */
export function derivePressingAdminCapId(pressingId: string, misoPressingPackageId: string): string {
  return deriveObjectID(
    pressingId,
    `${misoPressingPackageId}::pressing::PressingAdminCapKey`,
    UNIT_STRUCT_KEY_BYTES,
  );
}

/**
 * Where `currencyType`'s listing on `pressingId` lives. The key is phantom-typed, so
 * the currency rides in the key's TYPE — one listing per (pressing, currency), ever.
 */
export function deriveListingId(
  pressingId: string,
  currencyType: string,
  misoPressingPackageId: string,
): string {
  return deriveObjectID(
    pressingId,
    `${misoPressingPackageId}::listing::ListingKey<${normalizeStructTag(currencyType)}>`,
    UNIT_STRUCT_KEY_BYTES,
  );
}

/** Both derived ids a sale needs, from the release id alone. */
export function deriveSaleIds(
  releaseId: string,
  currencyType: string,
  misoPressingPackageId: string,
): { pressingId: string; listingId: string } {
  const pressingId = derivePressingId(releaseId, misoPressingPackageId);
  return { pressingId, listingId: deriveListingId(pressingId, currencyType, misoPressingPackageId) };
}

// ============================================================================
// Term constructors (shared by the builders below)
// ============================================================================

type Tx = Parameters<TxThunk>[0];

function priceArg(tx: Tx, misoPressingPackageId: string, price: ListingPrice) {
  const make = price.kind === "fixed" ? listing.newFixedPrice : listing.newFloorPrice;
  return tx.add(make({ package: misoPressingPackageId, arguments: [BigInt(price.amount)] }));
}

function switchArg(tx: Tx, misoPressingPackageId: string, state: ListingSwitch) {
  const make = state === "enabled" ? listing.newEnabledState : listing.newDisabledState;
  return tx.add(make({ package: misoPressingPackageId }));
}

function runStateArg(tx: Tx, misoPressingPackageId: string, state: PressingRunState) {
  const pkg = { package: misoPressingPackageId };
  switch (state.kind) {
    case "scheduled":
      return tx.add(pressing.newScheduledState({ ...pkg, arguments: [BigInt(state.startTimestampMs)] }));
    case "active":
      return tx.add(pressing.newActiveState(pkg));
    case "paused":
      return tx.add(pressing.newPausedState(pkg));
  }
}

// ============================================================================
// Opening the run
// ============================================================================

/** One currency's offer, as `openPressing` takes it. */
export interface ListingTerms {
  /** The `Currency` type argument, e.g. `0x2::sui::SUI`. */
  currencyType: string;
  price: ListingPrice;
  /** Defaults to `"enabled"` — a listing opened disabled takes no payment yet. */
  state?: ListingSwitch;
}

export interface OpenPressingParams {
  /** The `Release` this run presses copies of — also the pressing's derivation parent. */
  releaseId: string;
  /** The release's `ReleaseAdminCap`. Needed ONLY to open the run; every later change
   *  authorizes against the `PressingAdminCap` this mints. */
  releaseAdminCapId: string;
  /** Currencies to open the run in. May be empty — listings can be added later with
   *  {@link openListing} — but a run with no listings sells nothing. */
  listings: ListingTerms[];
  /** Run state at open. Defaults to `active` (sell immediately); `scheduled` is the
   *  trustless drop moment, and needs no later transaction to open. */
  state?: PressingRunState;
  /** Where to send the minted `PressingAdminCap` (usually the artist or their vault). */
  adminCapRecipient: string;
  misoPressingPackageId: string;
}

/**
 * Opens a release's pressing and lists it, in ONE transaction.
 *
 * `pressing::new` hands the `Pressing` back UNSHARED precisely so the listings can be
 * claimed off it before `share` puts it on chain — that ordering is the whole reason
 * this is a single builder and not three. A release can only ever open one pressing,
 * so this call is once-per-release forever; changing price or currency afterwards is
 * an edit ({@link setListingPrice}, {@link openListing}), never a re-open.
 */
export function openPressing(p: OpenPressingParams): TxThunk {
  return (tx) => {
    const pkg = p.misoPressingPackageId;
    const [run, adminCap] = tx.add(
      pressing._new({
        package: pkg,
        arguments: [p.releaseId, p.releaseAdminCapId, runStateArg(tx, pkg, p.state ?? { kind: "active" })],
      }),
    );
    for (const terms of p.listings) {
      tx.add(
        listing._new({
          package: pkg,
          arguments: [
            run!,
            adminCap!,
            priceArg(tx, pkg, terms.price),
            switchArg(tx, pkg, terms.state ?? "enabled"),
          ],
          typeArguments: [terms.currencyType],
        }),
      );
    }
    tx.add(pressing.share({ package: pkg, arguments: [run!] }));
    tx.transferObjects([adminCap!], p.adminCapRecipient);
  };
}

export interface OpenListingParams {
  /** The release whose pressing gains a currency. The pressing id derives from it. */
  releaseId: string;
  pressingAdminCapId: string;
  terms: ListingTerms;
  misoPressingPackageId: string;
}

/**
 * Adds a currency to a live pressing. Once per currency, ever — the slot is a derived
 * claim, so a second call for the same currency aborts. Everything after is an edit.
 */
export function openListing(p: OpenListingParams): TxThunk {
  return (tx) => {
    const pkg = p.misoPressingPackageId;
    tx.add(
      listing._new({
        package: pkg,
        arguments: [
          derivePressingId(p.releaseId, pkg),
          p.pressingAdminCapId,
          priceArg(tx, pkg, p.terms.price),
          switchArg(tx, pkg, p.terms.state ?? "enabled"),
        ],
        typeArguments: [p.terms.currencyType],
      }),
    );
  };
}

// ============================================================================
// Editing the offer
// ============================================================================

export interface SetListingPriceParams {
  releaseId: string;
  currencyType: string;
  pressingAdminCapId: string;
  price: ListingPrice;
  misoPressingPackageId: string;
}

/**
 * Reprices one currency in place, keeping the listing's address and identity. Safe
 * against in-flight buys by construction: a `fixed` buyer pays exactly, so a stale
 * payment aborts against the new price, and a `floor` buyer never pays more than the
 * balance they sent.
 */
export function setListingPrice(p: SetListingPriceParams): TxThunk {
  return (tx) => {
    const pkg = p.misoPressingPackageId;
    const { listingId } = deriveSaleIds(p.releaseId, p.currencyType, pkg);
    tx.add(
      listing.setPrice({
        package: pkg,
        arguments: [listingId, p.pressingAdminCapId, priceArg(tx, pkg, p.price)],
        typeArguments: [p.currencyType],
      }),
    );
  };
}

export interface SetListingStateParams {
  releaseId: string;
  currencyType: string;
  pressingAdminCapId: string;
  state: ListingSwitch;
  misoPressingPackageId: string;
}

/** Stops or resumes ONE currency. The run's other currencies carry on. */
export function setListingState(p: SetListingStateParams): TxThunk {
  return (tx) => {
    const pkg = p.misoPressingPackageId;
    const { listingId } = deriveSaleIds(p.releaseId, p.currencyType, pkg);
    tx.add(
      listing.setState({
        package: pkg,
        arguments: [listingId, p.pressingAdminCapId, switchArg(tx, pkg, p.state)],
        typeArguments: [p.currencyType],
      }),
    );
  };
}

export interface SetPressingStateParams {
  releaseId: string;
  pressingAdminCapId: string;
  state: PressingRunState;
  misoPressingPackageId: string;
}

/**
 * Moves the whole run between its three modes, over every currency at once. There is
 * no "end" — ending a campaign is `{ kind: "paused" }`.
 */
export function setPressingState(p: SetPressingStateParams): TxThunk {
  return (tx) => {
    const pkg = p.misoPressingPackageId;
    tx.add(
      pressing.setState({
        package: pkg,
        arguments: [
          derivePressingId(p.releaseId, pkg),
          p.pressingAdminCapId,
          runStateArg(tx, pkg, p.state),
        ],
      }),
    );
  };
}

// ============================================================================
// Buying
// ============================================================================

export interface BuyRecordParams {
  /**
   * The `Release` being bought a copy of. The pressing and this currency's listing
   * BOTH derive from it (see {@link deriveSaleIds}), so there is nothing to look up
   * and no way to pair a listing with the wrong pressing.
   */
  releaseId: string;
  /** Amount to pay in the currency's smallest unit (exact for `fixed`, ≥ for `floor`). */
  amount: bigint | number | string;
  /** The listing's `Currency` type, e.g. `0x2::sui::SUI`. */
  currencyType: string;
  /** The `miso_record` `Settings` shared object — it must authorize `miso_pressing`'s
   *  `MintWitness`, or the mint aborts. */
  settingsId: string;
  /** Where to send the pressed `Record` (usually the buyer). */
  recipient: string;
  misoPressingPackageId: string;
  /**
   * Set only when the buyer pays their OWN gas. Miso sponsors every purchase — the gas
   * coin is the sponsor's, so drawing a payment out of it would spend the wrong
   * wallet's money. Defaults to sponsored; bites only on SUI-priced listings.
   */
  useGasCoin?: boolean;
}

/**
 * Buys one record: sources the payment, calls `listing::buy`, and sends the pressed
 * `Record` to `recipient`. `buy` RETURNS the record rather than transferring it, so
 * the transfer here is not optional. The `Clock` is auto-supplied.
 *
 * ONE payment path, no coin picking. `tx.balance()` resolves the money at build time,
 * preferring the buyer's ADDRESS BALANCE — where value is assumed to live — and falling
 * back to coin objects inside the SDK if it must. Callers never enumerate coins: that
 * road showed a buyer their $1000 and then refused to spend a cent of it, because the
 * listing only saw `Coin<T>` objects and the money was in the address balance.
 *
 * `listing::buy` takes a bare `Balance<Currency>`, which is what makes that resolution
 * cheap: when the address balance covers the price, `tx.balance()` emits a single
 * `balance::redeem_funds` straight off the accumulator and no coin object is minted,
 * touched, or destroyed — leaving the sale free of any owned-object contention. Only
 * when it must fall back to coins does it merge, split, and `coin::into_balance`.
 */
export function buyRecord(p: BuyRecordParams): TxThunk {
  return (tx) => {
    const pkg = p.misoPressingPackageId;
    const { pressingId, listingId } = deriveSaleIds(p.releaseId, p.currencyType, pkg);
    const payment = tx.balance({
      type: p.currencyType,
      balance: BigInt(p.amount),
      useGasCoin: p.useGasCoin ?? false,
    });
    const record = tx.add(
      listing.buy({
        package: pkg,
        arguments: [listingId, pressingId, payment, p.settingsId],
        typeArguments: [p.currencyType],
      }),
    );
    tx.transferObjects([record], p.recipient);
  };
}

// ============================================================================
// Reads
// ============================================================================

/** A parsed `Pressing` — the run itself. */
export interface PressingView {
  id: string;
  releaseId: string;
  state: PressingRunState & { startTimestampMs?: bigint };
  /** Records pressed so far; also the most recent number. Not a cap — nothing counts
   *  against it, and there is no sold-out state to reach. */
  supply: bigint;
}

/** A parsed `Listing<Currency>` — one currency's offer on the run. */
export interface ListingView {
  id: string;
  releaseId: string;
  pressingId: string;
  price: { kind: "fixed" | "floor"; amount: bigint };
  state: ListingSwitch;
  /** The `Currency` type, parsed from the object's type tag (`null` if unavailable). */
  currencyType: string | null;
}

/** Extracts `CURRENCY` from a `…::listing::Listing<CURRENCY>` type tag. */
function currencyFromType(type: string | null | undefined): string | null {
  if (!type) return null;
  const lt = type.indexOf("<");
  return lt >= 0 && type.endsWith(">") ? type.slice(lt + 1, -1) : null;
}

/** Reads one object's BCS content + type, or `null` when it does not exist. */
async function fetch(
  client: ClientWithCoreApi,
  objectId: string,
): Promise<{ content: Uint8Array; type?: string } | null> {
  try {
    const { object } = await client.core.getObject({ objectId, include: { content: true } });
    return object?.content ? { content: object.content, type: object.type } : null;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

// The generated `MoveEnum` parsers emit `{ $kind, <Variant>: … }`; older ones omitted
// `$kind`. Both shapes are accepted so a codegen bump cannot silently mis-read a price.
function variant<T extends string>(v: { $kind?: string } & Record<string, unknown>, ...names: T[]): T {
  for (const name of names) if (v.$kind === name || v[name] != null) return name;
  return names[0]!;
}

/**
 * Fetches and parses a `Pressing`, or `null` if the release has never opened one.
 *
 * NOTE: like the old drop reader, this deliberately deviates from the core-getter
 * convention in `./queries.ts` (throw on missing object). A pressing's address is
 * computable for ANY release, so probing one that was never opened is a normal state,
 * not a broken reference — absence is `null` and only transport failures throw.
 */
export async function getPressing(client: ClientWithCoreApi, pressingId: string): Promise<PressingView | null> {
  const got = await fetch(client, pressingId);
  if (!got) return null;
  const parsed = pressing.Pressing.parse(got.content);
  const s = parsed.state as { $kind?: string; Scheduled?: { start_timestamp_ms: string } };
  const kind = variant(s, "Scheduled", "Active", "Paused");
  return {
    id: pressingId,
    releaseId: parsed.release_id,
    state:
      kind === "Scheduled"
        ? { kind: "scheduled", startTimestampMs: BigInt(s.Scheduled?.start_timestamp_ms ?? "0") }
        : kind === "Paused"
          ? { kind: "paused" }
          : { kind: "active" },
    supply: BigInt(parsed.supply),
  };
}

/** Fetches and parses a `Listing<Currency>`, or `null` if that currency is not listed. */
export async function getListing(client: ClientWithCoreApi, listingId: string): Promise<ListingView | null> {
  const got = await fetch(client, listingId);
  if (!got) return null;
  const parsed = listing.Listing.parse(got.content);
  const p = parsed.price as { $kind?: string; Fixed?: { amount: string }; Floor?: { amount: string } };
  const priceKind = variant(p, "Fixed", "Floor");
  const st = parsed.state as { $kind?: string; Enabled?: unknown; Disabled?: unknown };
  return {
    id: listingId,
    releaseId: parsed.release_id,
    pressingId: parsed.pressing_id,
    price: {
      kind: priceKind === "Fixed" ? "fixed" : "floor",
      amount: BigInt((priceKind === "Fixed" ? p.Fixed?.amount : p.Floor?.amount) ?? "0"),
    },
    state: variant(st, "Enabled", "Disabled") === "Enabled" ? "enabled" : "disabled",
    currencyType: currencyFromType(got.type),
  };
}

export interface GetSaleParams {
  /** The release to resolve a sale for. */
  releaseId: string;
  /** The currency the buyer intends to pay in. */
  currencyType: string;
  misoPressingPackageId: string;
}

/**
 * Resolves a release's run AND one currency's offer in a single round trip, by pure
 * address math — no registry, no pointer, no event scan. `pressing: null` means the
 * release has never opened one; `listing: null` means it does not sell in that
 * currency (the other currencies, if any, are unaffected).
 */
export async function getSale(
  client: ClientWithCoreApi,
  p: GetSaleParams,
): Promise<{ pressing: PressingView | null; listing: ListingView | null }> {
  const { pressingId, listingId } = deriveSaleIds(p.releaseId, p.currencyType, p.misoPressingPackageId);
  const [pressingView, listingView] = await Promise.all([
    getPressing(client, pressingId),
    getListing(client, listingId),
  ]);
  return { pressing: pressingView, listing: listingView };
}
