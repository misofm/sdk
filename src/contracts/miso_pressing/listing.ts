/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * One currency's offer on a pressing — a _Listing_.
 * 
 * A listing answers exactly two questions: **what does it cost** and **can you pay
 * in this currency**. Everything about _what you get_ — the run, the number —
 * belongs to the `Pressing`. So a pressing sold in SUI and in USDC has two
 * listings, each with its own price and switch, both drawing on the same number
 * sequence.
 * 
 * A listing's UID is derived off its pressing's UID at `ListingKey<Currency>()`,
 * so there is exactly one listing per (pressing, currency) — ever — and its
 * address is computable from the pressing's alone. The key is _phantom-typed_
 * rather than a stored `TypeName`, which makes the currency part of the key's
 * type: distinct currencies are distinct key types, so `derived_object::claim`
 * enforces once-per-currency by itself and the pressing needs no set of currencies
 * to check against. Listings are **permanent**: never destroyed, never replaced.
 * The offer changes _in place_ — repriced, disabled, re-enabled — and the listing
 * keeps its identity through every change.
 * 
 * # Price
 * 
 * `Fixed` (pay exactly) or `Floor` (pay at least; overpayment is kept as a tip,
 * not refunded). The whole payment forwards to the release's address. Settable
 * with the `PressingAdminCap` (`set_price`) — repricing is an edit, not a teardown
 * — and a change cannot catch a buyer out: a `Fixed` buyer pays _exactly_, so a
 * stale payment aborts against a new price, and a `Floor` buyer never pays more
 * than the balance they sent.
 * 
 * Payment is a `Balance<Currency>`, never a `Coin<Currency>`. A coin is a wrapper
 * an object id, an owner, and a wrapping/unwrapping round trip — that this path
 * has no use for: the money comes in from wherever the PTB got it (a withdrawal
 * off the buyer's accumulator, a `coin::into_balance`, a split of some larger
 * balance) and goes straight back out to the release's address via
 * `balance::send_funds`. Taking the bare value means `buy` never mints an object
 * just to destroy it, and never forces the caller to make one either.
 * 
 * # Two switches
 * 
 * A listing is `Enabled` or `Disabled`; a disabled listing takes no payment in its
 * currency, while the pressing's other currencies carry on. Above it, the
 * pressing's own `Scheduled → Active → Paused` governs every currency at once
 * (`pressing::mint_next`). A sale needs both open.
 * 
 * The **when** lives on the pressing, not here: a drop moment is a fact about the
 * release going on sale, not about one payment rail, and a run that opened in SUI
 * at Friday 8pm and in USDC at some other time would have two drop moments and one
 * number sequence. So a listing carries no schedule — only whether its currency is
 * taken.
 * 
 * # The certificate
 * 
 * What the buyer paid is not part of the record — it is a fact about the _sale_ —
 * so it rides out on the record's `Certificate`, stamped by `pressing::mint_next`
 * alongside the number. One field, written once, in the transaction that pressed
 * the record. `RecordSoldEvent` also snapshots both the accepted `Price` and the
 * amount paid, so an indexer can distinguish fixed sales from floor sales and
 * compute tips without replaying listing state.
 */

import { MoveTuple, MoveEnum, MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/miso_pressing::listing';
export const ListingKey = new MoveTuple({ name: `${$moduleName}::ListingKey<phantom Currency>`, fields: [bcs.bool()] });
/** Pricing policy for a listing. */
export const Price = new MoveEnum({ name: `${$moduleName}::Price`, fields: {
        /** Pay exactly `amount`. */
        Fixed: new MoveStruct({ name: `Price.Fixed`, fields: {
                amount: bcs.u64()
            } }),
        /** Pay at least `amount`; overpayment is forwarded to the release, not refunded. */
        Floor: new MoveStruct({ name: `Price.Floor`, fields: {
                amount: bcs.u64()
            } })
    } });
/** Whether this currency is accepted. Set at creation and by `set_state`. */
export const ListingState = new MoveEnum({ name: `${$moduleName}::ListingState`, fields: {
        /** Accepting payment in this currency, if the pressing is also active. */
        Enabled: null,
        /** Not accepting payment in this currency. Other currencies are unaffected. */
        Disabled: null
    } });
export const Listing = new MoveStruct({ name: `${$moduleName}::Listing<phantom Currency>`, fields: {
        id: bcs.Address,
        /** The release whose address collects the proceeds. */
        release_id: bcs.Address,
        /** The pressing these records come out of. */
        pressing_id: bcs.Address,
        /** What a buyer must pay per record. */
        price: Price,
        /** Whether this currency is accepted right now. */
        state: ListingState
    } });
export const ListingOpenedEvent = new MoveStruct({ name: `${$moduleName}::ListingOpenedEvent<phantom Currency>`, fields: {
        listing_id: bcs.Address,
        pressing_id: bcs.Address,
        release_id: bcs.Address,
        price: Price,
        state: ListingState
    } });
export const RecordSoldEvent = new MoveStruct({ name: `${$moduleName}::RecordSoldEvent<phantom Currency>`, fields: {
        listing_id: bcs.Address,
        pressing_id: bcs.Address,
        release_id: bcs.Address,
        record_id: bcs.Address,
        number: bcs.u64(),
        /**
         * The offer accepted by this sale. Together with `paid`, this distinguishes a
         * fixed-price sale from a floor-price sale and makes any tip directly computable.
         */
        price: Price,
        paid: bcs.u64(),
        buyer: bcs.Address
    } });
export const ListingStateChangedEvent = new MoveStruct({ name: `${$moduleName}::ListingStateChangedEvent<phantom Currency>`, fields: {
        listing_id: bcs.Address,
        pressing_id: bcs.Address,
        state: ListingState
    } });
export const ListingPriceChangedEvent = new MoveStruct({ name: `${$moduleName}::ListingPriceChangedEvent<phantom Currency>`, fields: {
        listing_id: bcs.Address,
        pressing_id: bcs.Address,
        price: Price
    } });
export interface NewFixedPriceArguments {
    amount: RawTransactionArgument<number | bigint>;
}
export interface NewFixedPriceOptions {
    package?: string;
    arguments: NewFixedPriceArguments | [
        amount: RawTransactionArgument<number | bigint>
    ];
}
/** A fixed price: a buyer must pay exactly `amount`. */
export function newFixedPrice(options: NewFixedPriceOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["amount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'new_fixed_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface NewFloorPriceArguments {
    amount: RawTransactionArgument<number | bigint>;
}
export interface NewFloorPriceOptions {
    package?: string;
    arguments: NewFloorPriceArguments | [
        amount: RawTransactionArgument<number | bigint>
    ];
}
/** A floor price: a buyer must pay at least `amount`; overpayment is kept. */
export function newFloorPrice(options: NewFloorPriceOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["amount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'new_floor_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface NewEnabledStateOptions {
    package?: string;
    arguments?: [
    ];
}
/** The enabled state: this currency is accepted. */
export function newEnabledState(options: NewEnabledStateOptions = {}) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'new_enabled_state',
    });
}
export interface NewDisabledStateOptions {
    package?: string;
    arguments?: [
    ];
}
/** The disabled state: this currency is not accepted. */
export function newDisabledState(options: NewDisabledStateOptions = {}) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'new_disabled_state',
    });
}
export interface NewArguments {
    pressing: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    price: TransactionArgument;
    state: TransactionArgument;
}
export interface NewOptions {
    package?: string;
    arguments: NewArguments | [
        pressing: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        price: TransactionArgument,
        state: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
/**
 * List the pressing for sale in `Currency` at the given price and state, and share
 * it.
 *
 * Exactly one listing per (pressing, currency), ever: the slot is a derived-object
 * claim on the pressing at `ListingKey<Currency>()`, and listings are never
 * destroyed — so a second call for the same currency aborts in the claim. Every
 * later change to this currency's offer is an edit to this object, not a
 * replacement of it.
 */
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null,
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["pressing", "cap", "price", "state"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface BuyArguments {
    self: RawTransactionArgument<string>;
    pressing: RawTransactionArgument<string>;
    payment: TransactionArgument;
    settings: RawTransactionArgument<string>;
}
export interface BuyOptions {
    package?: string;
    arguments: BuyArguments | [
        self: RawTransactionArgument<string>,
        pressing: RawTransactionArgument<string>,
        payment: TransactionArgument,
        settings: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Buy one record: pay this listing's price, take the next number out of the
 * pressing.
 *
 * `payment` is a bare `Balance<Currency>` and must satisfy the price (exactly, for
 * `Fixed`; at least, for `Floor`). The ENTIRE payment forwards to the release's
 * address — under `Floor`, anything above the floor is kept as a tip, not
 * refunded. The record's number is the pressing's next 1-based value, shared with
 * every other currency selling the same run, and its UID is derived off the
 * pressing. The sale's terms ride out on the record's `Certificate`. `settings`
 * must authorize this package's `MintWitness`.
 *
 * Both switches must be open: this listing `Enabled`, checked here, and the run
 * selling at this moment, checked in `pressing::mint_next`.
 */
export function buy(options: BuyOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "pressing", "payment", "settings"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'buy',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface SetStateArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    state: TransactionArgument;
}
export interface SetStateOptions {
    package?: string;
    arguments: SetStateArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        state: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
/**
 * Enable or disable this currency. Leaves every other currency untouched; to stop
 * the whole run at once, pause the pressing (`pressing::set_state`).
 */
export function setState(options: SetStateOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "state"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'set_state',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface SetPriceArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    price: TransactionArgument;
}
export interface SetPriceOptions {
    package?: string;
    arguments: SetPriceArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        price: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
/**
 * Reprice the listing in place. Safe against in-flight buys by construction: a
 * `Fixed` buyer pays exactly, so a stale payment aborts against the new price, and
 * a `Floor` buyer never pays more than the coin they sent.
 */
export function setPrice(options: SetPriceOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "price"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'set_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface DeriveIdArguments {
    pressingId: RawTransactionArgument<string>;
}
export interface DeriveIdOptions {
    package?: string;
    arguments: DeriveIdArguments | [
        pressingId: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * The address `Currency`'s listing on `pressing_id` occupies — pure address math,
 * computable before the listing exists.
 */
export function deriveId(options: DeriveIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["pressingId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'derive_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface HasListingArguments {
    pressing: RawTransactionArgument<string>;
}
export interface HasListingOptions {
    package?: string;
    arguments: HasListingArguments | [
        pressing: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Whether `pressing` has a listing in `Currency` yet. Reads the derived slot
 * directly, so the pressing stores no set of currencies; to enumerate every
 * listing, index `ListingOpenedEvent<Currency>`.
 */
export function hasListing(options: HasListingOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["pressing"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'has_listing',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IdArguments {
    self: RawTransactionArgument<string>;
}
export interface IdOptions {
    package?: string;
    arguments: IdArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function id(options: IdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReleaseIdArguments {
    self: RawTransactionArgument<string>;
}
export interface ReleaseIdOptions {
    package?: string;
    arguments: ReleaseIdArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function releaseId(options: ReleaseIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'release_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface PressingIdArguments {
    self: RawTransactionArgument<string>;
}
export interface PressingIdOptions {
    package?: string;
    arguments: PressingIdArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function pressingId(options: PressingIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'pressing_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface PriceArguments {
    self: RawTransactionArgument<string>;
}
export interface PriceOptions {
    package?: string;
    arguments: PriceArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function price(options: PriceOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface StateArguments {
    self: RawTransactionArgument<string>;
}
export interface StateOptions {
    package?: string;
    arguments: StateArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function state(options: StateOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'state',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IsLiveArguments {
    self: RawTransactionArgument<string>;
    pressing: RawTransactionArgument<string>;
}
export interface IsLiveOptions {
    package?: string;
    arguments: IsLiveArguments | [
        self: RawTransactionArgument<string>,
        pressing: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Whether `buy` would be accepted right now: the right pressing, this currency
 * enabled, and the run selling at this moment (open, and past its drop time if it
 * has one).
 */
export function isLive(options: IsLiveOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "pressing"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'is_live',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface AmountArguments {
    self: TransactionArgument;
}
export interface AmountOptions {
    package?: string;
    arguments: AmountArguments | [
        self: TransactionArgument
    ];
}
/** The price amount (the fixed price, or the floor). */
export function amount(options: AmountOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'listing',
        function: 'amount',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}