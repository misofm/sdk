/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * A primary record sale — a _Drop_.
 * 
 * A `Drop` is a shared object that mints and sells numbered `Record` copies of a
 * release, forwarding each payment to the release's address. Each purchase mints a
 * `Record` whose UID is _derived_ off the `Drop`'s own UID (keyed by the 1-based
 * serial number it was sold at), so every copy is deterministically addressable
 * from its drop and can be minted at most once.
 * 
 * # Scarcity is the artist's choice
 * 
 * A drop's terms are three enums, each fixed at creation:
 * 
 * - `Price` — `Fixed` (pay exactly) or `Floor` (pay at least; overpayment kept);
 * - `Supply` — `Uncapped`, or `Capped { max }` ("1000 records only");
 * - `Window` — `Unbounded { start }`, or `Bounded { start, end }` ("two weeks
 *   only").
 * 
 * Scarcity is a per-edition decision by the artist, not a protocol stance — and it
 * is never a dead end: fans who miss a drop can always be answered with a new
 * edition. What a drop never has is an access gate: no allowlists, auctions, or
 * raffles — while a drop is live, anyone may buy.
 * 
 * # Editions — one live drop per release
 * 
 * A release sells through at most ONE drop at a time. `new` opens edition `0`;
 * `new_edition` opens edition `n + 1` by CONSUMING edition `n` — the predecessor
 * shared object is destroyed, so two editions can never sell side by side, and the
 * edition sequence is gap-free by construction (you must hold edition `n` to open
 * `n + 1`). Because a drop is immutable once created, `new_edition` is also the
 * only way to change anything: a new price, a new currency, a fresh run after a
 * sell-out or a closed window — each is simply the next edition.
 * 
 * The RELEASE is the parent: drop UIDs are _derived_ off the release's UID (via
 * its cap-gated `uid_mut` extension surface), keyed by `DropKey(edition)`. Every
 * edition's address is therefore computable from the release id alone — and since
 * claim markers outlive the objects they name, a destroyed edition's key can never
 * be claimed again. The release's UID also carries a `CurrentDropKey → ID` dynamic
 * field pointing at the live drop (superseded drops are deleted, so the pointer —
 * not address probing — is how clients find the current edition).
 * 
 * # Records
 * 
 * Serial numbers restart at 1 each edition: a record is "edition `e`, number `n`
 * (of `max`)", and it stamps the `Currency` and the exact amount paid. A record
 * from a destroyed edition remains verifiable — `record::is_derived_from` is pure
 * address math and does not need the drop object alive.
 * 
 * # Authority
 * 
 * Opening edition 0 needs the release's `ReleaseAdminCap` (enforced by the
 * protocol's `release::uid_mut`); opening edition `n + 1` needs the cap AND the
 * predecessor drop. Minting is authorized separately: this package presents its
 * `MintWitness`, whose type must be on `miso_record`'s `Settings` allowlist. A
 * different shop with different mechanics is just another package with its own
 * witness — same `Record`, no `miso_record` redeploy.
 */

import { MoveTuple, MoveStruct, MoveEnum, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/miso_drop::drop';
export const DropKey = new MoveTuple({ name: `${$moduleName}::DropKey`, fields: [bcs.u32()] });
export const CurrentDropKey = new MoveTuple({ name: `${$moduleName}::CurrentDropKey`, fields: [bcs.bool()] });
export const MintWitness = new MoveStruct({ name: `${$moduleName}::MintWitness`, fields: {
        dummy_field: bcs.bool()
    } });
/** Pricing policy for a drop. */
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
/** Supply policy for a drop. */
export const Supply = new MoveEnum({ name: `${$moduleName}::Supply`, fields: {
        /** No quantity limit — the edition never sells out. */
        Uncapped: null,
        /** Sells out after `max` records. */
        Capped: new MoveStruct({ name: `Supply.Capped`, fields: {
                max: bcs.u64()
            } })
    } });
/** When a drop sells. `buy` rejects purchases outside the window. */
export const Window = new MoveEnum({ name: `${$moduleName}::Window`, fields: {
        /**
          * Opens at `start_timestamp_ms` (Unix ms; may be in the future — a scheduled drop)
          * and never closes.
          */
        Unbounded: new MoveStruct({ name: `Window.Unbounded`, fields: {
                start_timestamp_ms: bcs.u64()
            } }),
        /** Sells only within `[start_timestamp_ms, end_timestamp_ms]` (Unix ms). */
        Bounded: new MoveStruct({ name: `Window.Bounded`, fields: {
                start_timestamp_ms: bcs.u64(),
                end_timestamp_ms: bcs.u64()
            } })
    } });
export const Drop = new MoveStruct({ name: `${$moduleName}::Drop<phantom Currency>`, fields: {
        id: bcs.Address,
        /** The release these records are copies of. */
        release_id: bcs.Address,
        /** Which edition of the release this is (0 = first drop). */
        edition: bcs.u32(),
        /** How much a buyer must pay per record. */
        price: Price,
        /** How many records this edition may ever sell. */
        supply: Supply,
        /** Records sold so far; also the most recently sold record's number. */
        quantity_sold: bcs.u64(),
        /** When this edition sells. */
        window: Window
    } });
export const DropCreatedEvent = new MoveStruct({ name: `${$moduleName}::DropCreatedEvent<phantom Currency>`, fields: {
        drop_id: bcs.Address,
        release_id: bcs.Address,
        edition: bcs.u32(),
        price: Price,
        supply: Supply,
        window: Window
    } });
export const RecordSoldEvent = new MoveStruct({ name: `${$moduleName}::RecordSoldEvent<phantom Currency>`, fields: {
        drop_id: bcs.Address,
        release_id: bcs.Address,
        edition: bcs.u32(),
        record_id: bcs.Address,
        number: bcs.u64(),
        paid: bcs.u64(),
        buyer: bcs.Address
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
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["amount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
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
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["amount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'new_floor_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface NewUncappedSupplyOptions {
    package?: string;
    arguments?: [
    ];
}
/** An uncapped supply: the edition never sells out. */
export function newUncappedSupply(options: NewUncappedSupplyOptions = {}) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'new_uncapped_supply',
    });
}
export interface NewCappedSupplyArguments {
    max: RawTransactionArgument<number | bigint>;
}
export interface NewCappedSupplyOptions {
    package?: string;
    arguments: NewCappedSupplyArguments | [
        max: RawTransactionArgument<number | bigint>
    ];
}
/**
 * A capped supply: the edition sells out after `max` records. `max` must be at
 * least 1.
 */
export function newCappedSupply(options: NewCappedSupplyOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["max"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'new_capped_supply',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface NewUnboundedWindowArguments {
    startTimestampMs: RawTransactionArgument<number | bigint>;
}
export interface NewUnboundedWindowOptions {
    package?: string;
    arguments: NewUnboundedWindowArguments | [
        startTimestampMs: RawTransactionArgument<number | bigint>
    ];
}
/**
 * A window that opens at `start_timestamp_ms` (may be in the future) and never
 * closes.
 */
export function newUnboundedWindow(options: NewUnboundedWindowOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["startTimestampMs"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'new_unbounded_window',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface NewBoundedWindowArguments {
    startTimestampMs: RawTransactionArgument<number | bigint>;
    endTimestampMs: RawTransactionArgument<number | bigint>;
}
export interface NewBoundedWindowOptions {
    package?: string;
    arguments: NewBoundedWindowArguments | [
        startTimestampMs: RawTransactionArgument<number | bigint>,
        endTimestampMs: RawTransactionArgument<number | bigint>
    ];
}
/**
 * A window selling only within `[start_timestamp_ms, end_timestamp_ms]`. The close
 * must be strictly after the open.
 */
export function newBoundedWindow(options: NewBoundedWindowOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        'u64',
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["startTimestampMs", "endTimestampMs"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'new_bounded_window',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface NewArguments {
    release: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    price: TransactionArgument;
    supply: TransactionArgument;
    window: TransactionArgument;
}
export interface NewOptions {
    package?: string;
    arguments: NewArguments | [
        release: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        price: TransactionArgument,
        supply: TransactionArgument,
        window: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
/**
 * Create and share a release's FIRST drop — edition `0` — selling copies on the
 * given `price` / `supply` / `window` terms. Authorized by the release's admin cap
 * (enforced by `release::uid_mut`). The drop is immutable once created; every
 * later change (price, currency, a fresh run) is `new_edition`.
 *
 * Edition 0's key can only ever be claimed once, so a release's edition sequence
 * can only ever start here — calling `new` twice for the same release aborts.
 *
 * Term validity is enforced at construction (`new_capped_supply`,
 * `new_bounded_window`); the one check left here is temporal — a bounded window
 * must not already be elapsed against the `Clock`.
 */
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    const parameterNames = ["release", "cap", "price", "supply", "window"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface NewEditionArguments {
    release: RawTransactionArgument<string>;
    old: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    price: TransactionArgument;
    supply: TransactionArgument;
    window: TransactionArgument;
}
export interface NewEditionOptions {
    package?: string;
    arguments: NewEditionArguments | [
        release: RawTransactionArgument<string>,
        old: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        price: TransactionArgument,
        supply: TransactionArgument,
        window: TransactionArgument
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Open the NEXT edition of a release's drop, CONSUMING the current one. The
 * predecessor shared object is destroyed — so at most one drop per release is ever
 * live, and this is the one way to change terms: a new price, a new `Currency`, a
 * new supply or window. It may be called while the predecessor is still selling (a
 * cutover) or after it sold out / closed (a fresh run for fans who missed it).
 *
 * Records already sold by the predecessor are untouched and remain verifiable
 * against its (now deleted) id. Serial numbers restart at 1 for the new edition.
 */
export function newEdition(options: NewEditionOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    const parameterNames = ["release", "old", "cap", "price", "supply", "window"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'new_edition',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface BuyArguments {
    self: RawTransactionArgument<string>;
    payment: RawTransactionArgument<string>;
    settings: RawTransactionArgument<string>;
}
export interface BuyOptions {
    package?: string;
    arguments: BuyArguments | [
        self: RawTransactionArgument<string>,
        payment: RawTransactionArgument<string>,
        settings: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Buy one record from a live drop — one inside its window with supply left.
 *
 * `payment` must satisfy the price (exactly, for `Fixed`; at least, for `Floor`).
 * The ENTIRE payment is forwarded to the release's address — under `Floor`,
 * anything paid above the floor is kept (a pay-what-you-want tip), not refunded.
 * The sold record's number is the 1-based `quantity_sold` count, its UID is
 * derived off the drop, and it records the drop's `edition`, the `Currency`, and
 * the amount paid. `settings` must authorize this package's `MintWitness`.
 */
export function buy(options: BuyOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null,
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "payment", "settings"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'buy',
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
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
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
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'release_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface EditionArguments {
    self: RawTransactionArgument<string>;
}
export interface EditionOptions {
    package?: string;
    arguments: EditionArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function edition(options: EditionOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'edition',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface QuantitySoldArguments {
    self: RawTransactionArgument<string>;
}
export interface QuantitySoldOptions {
    package?: string;
    arguments: QuantitySoldArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function quantitySold(options: QuantitySoldOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'quantity_sold',
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
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface SupplyArguments {
    self: RawTransactionArgument<string>;
}
export interface SupplyOptions {
    package?: string;
    arguments: SupplyArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function supply(options: SupplyOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'supply',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface WindowArguments {
    self: RawTransactionArgument<string>;
}
export interface WindowOptions {
    package?: string;
    arguments: WindowArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function window(options: WindowOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'window',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface MaxSupplyArguments {
    self: RawTransactionArgument<string>;
}
export interface MaxSupplyOptions {
    package?: string;
    arguments: MaxSupplyArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Flat projection of `supply`: the cap, or `none` if uncapped. */
export function maxSupply(options: MaxSupplyOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'max_supply',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface StartTimestampMsArguments {
    self: RawTransactionArgument<string>;
}
export interface StartTimestampMsOptions {
    package?: string;
    arguments: StartTimestampMsArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Flat projection of `window`: when the drop opens. */
export function startTimestampMs(options: StartTimestampMsOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'start_timestamp_ms',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface EndTimestampMsArguments {
    self: RawTransactionArgument<string>;
}
export interface EndTimestampMsOptions {
    package?: string;
    arguments: EndTimestampMsArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Flat projection of `window`: the close, or `none` if unbounded. */
export function endTimestampMs(options: EndTimestampMsOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'end_timestamp_ms',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IsSoldOutArguments {
    self: RawTransactionArgument<string>;
}
export interface IsSoldOutOptions {
    package?: string;
    arguments: IsSoldOutArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Whether the drop has sold every one of its `Capped { max }` records (always
 * `false` for an uncapped drop).
 */
export function isSoldOut(options: IsSoldOutOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'is_sold_out',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IsLiveArguments {
    self: RawTransactionArgument<string>;
}
export interface IsLiveOptions {
    package?: string;
    arguments: IsLiveArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Whether `buy` would be accepted right now: inside the window and not sold out. */
export function isLive(options: IsLiveOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'is_live',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface CurrentDropIdArguments {
    release: RawTransactionArgument<string>;
}
export interface CurrentDropIdOptions {
    package?: string;
    arguments: CurrentDropIdArguments | [
        release: RawTransactionArgument<string>
    ];
}
/**
 * The `ID` of a release's live drop, or `none` if the release has never dropped.
 * (There is always at most one: `new_edition` destroys the predecessor.)
 */
export function currentDropId(options: CurrentDropIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["release"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'current_drop_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
    const packageAddress = options.package ?? '@local-pkg/miso_drop';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'drop',
        function: 'amount',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}