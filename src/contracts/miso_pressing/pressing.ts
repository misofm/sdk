/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * A release's record production — its _Pressing_.
 * 
 * A release has exactly one pressing, and the pressing is one uncapped run of
 * records: every copy ever made draws its number from this single counter,
 * forever. There are no editions, no supply caps, and no sold-out state — scarcity
 * on Miso is what a record _accrues_ (playtime above all), not how few of it were
 * printed. The pressing owns two things and only two things: the **run** the
 * records number against, and the **switch** that stops it.
 * 
 * ```text
 * Release
 *  └─ Pressing              the run, and when it sells at all       PressingKey()
 *      ├─ PressingAdminCap  authority over price and state         PressingAdminCapKey()
 *      ├─ Listing<SUI>      what it costs in one currency          ListingKey<SUI>()
 *      └─ Listing<USDC>
 * ```
 * 
 * # Everything is address math
 * 
 * A pressing's UID is derived off its release's UID at a singleton key, its admin
 * cap's and each listing's off the pressing's, and records off the pressing's at
 * their number. So every object in the tree is reachable from the release id
 * alone, by pure computation — no registry, no pointer that has to be maintained,
 * and no stored set of listings: a listing either exists at its derived address or
 * it does not (`listing::has_listing`), and `ListingOpenedEvent<Currency>`
 * enumerates them for an indexer. It also makes the number sequence gap-free for
 * free, and every record verifiable against its pressing from chain state alone
 * (`verify_record`).
 * 
 * # Starting and stopping is state, never teardown
 * 
 * Nothing here is ever destroyed, sealed, or wound down — deleting a pressing
 * would strand its whole derived subtree, so there is no destructor at all. The
 * run's lifecycle is `Scheduled → Active → Paused → Active`: it opens itself at
 * its drop moment (no artist transaction, and nobody can buy early), and after
 * that the artist stops and starts it at will. The first transition is real, not
 * computed — the first sale past the start rewrites `Scheduled` to `Active` inside
 * `mint_next`, which is why `Scheduled` only ever describes a run still waiting.
 * Below it, each listing's `Enabled | Disabled` governs one currency. A run that
 * is paused or not yet open sells in no currency, whatever the listings say.
 * 
 * There is no end state and no expiry: an uncapped, permanent run has nothing to
 * count down to, and a time-limited sale is scarcity theater this design rejects.
 * An artist ending a campaign pauses it.
 * 
 * # Authority
 * 
 * Opening a pressing needs the release's `ReleaseAdminCap`, enforced by the
 * protocol's `release::uid_mut`, and hands back a `PressingAdminCap`. Everything
 * after that — pricing, pausing, opening listings — authorizes against the
 * pressing cap alone.
 * 
 * The split is deliberate and it is about money, not tidiness. `ReleaseAdminCap`
 * yields `release::uid_mut`, and `balance::withdraw_funds_from_object` is gated on
 * `&mut UID` alone — so the release cap can withdraw the sales revenue that `buy`
 * forwards to the release's address. Under one cap, "may reprice a listing" and
 * "may take the money" would be the same grant. The pressing cap is the routine
 * one, safe to delegate to whoever runs the shop; the release cap stays with the
 * rightsholder.
 */

import { MoveTuple, MoveStruct, MoveEnum, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/miso_pressing::pressing';
export const PressingKey = new MoveTuple({ name: `${$moduleName}::PressingKey`, fields: [bcs.bool()] });
export const PressingAdminCapKey = new MoveTuple({ name: `${$moduleName}::PressingAdminCapKey`, fields: [bcs.bool()] });
export const MintWitness = new MoveStruct({ name: `${$moduleName}::MintWitness`, fields: {
        dummy_field: bcs.bool()
    } });
/**
 * Whether the run sells, over every currency at once. The lifecycle runs
 * `Scheduled → Active → Paused → Active`: a pressing opens itself at its drop
 * moment, then the artist stops and starts it at will.
 */
export const PressingState = new MoveEnum({ name: `${$moduleName}::PressingState`, fields: {
        /**
          * Opens the moment the clock passes `start_timestamp_ms` (Unix ms), with no
          * further action from anyone. A start already in the past sells now.
          *
          * This is a _transitional_ state: the first sale past the start rewrites it to
          * `Active` (in `mint_next`, before any sales logic), so a run reads `Scheduled`
          * only while it is still waiting. Between the start and that first sale the run
          * already sells — `is_selling` answers against the clock — so nobody has to go
          * first for the drop to be open.
          *
          * Consequence worth knowing: once the transition fires the start time is gone from
          * the object. `PressingOpenedEvent` and `PressingStateChangedEvent` carry it, so
          * "when was this run scheduled for" is an event-log question, not an object read.
          */
        Scheduled: new MoveStruct({ name: `PressingState.Scheduled`, fields: {
                start_timestamp_ms: bcs.u64()
            } }),
        /** Selling, subject to each listing's own state. */
        Active: null,
        /** Selling in no currency, whatever the listings say. */
        Paused: null
    } });
export const Pressing = new MoveStruct({ name: `${$moduleName}::Pressing`, fields: {
        id: bcs.Address,
        /** The release these records are copies of. */
        release_id: bcs.Address,
        /** Whether the run sells at all, in any currency. */
        state: PressingState,
        /**
         * Records pressed so far; also the most recent number. Read on every mint — this
         * is the sequence itself, not a statistic.
         */
        supply: bcs.u64()
    } });
export const PressingAdminCap = new MoveStruct({ name: `${$moduleName}::PressingAdminCap`, fields: {
        id: bcs.Address,
        /** The pressing this cap controls. Every mutator asserts against it. */
        pressing_id: bcs.Address
    } });
export const PressingOpenedEvent = new MoveStruct({ name: `${$moduleName}::PressingOpenedEvent`, fields: {
        pressing_id: bcs.Address,
        release_id: bcs.Address,
        state: PressingState
    } });
export const PressingStateChangedEvent = new MoveStruct({ name: `${$moduleName}::PressingStateChangedEvent`, fields: {
        pressing_id: bcs.Address,
        state: PressingState
    } });
export interface NewScheduledStateArguments {
    startTimestampMs: RawTransactionArgument<number | bigint>;
}
export interface NewScheduledStateOptions {
    package?: string;
    arguments: NewScheduledStateArguments | [
        startTimestampMs: RawTransactionArgument<number | bigint>
    ];
}
/** The scheduled state: the run opens itself at `start_timestamp_ms` (Unix ms). */
export function newScheduledState(options: NewScheduledStateOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["startTimestampMs"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'new_scheduled_state',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface NewActiveStateOptions {
    package?: string;
    arguments?: [
    ];
}
/** The active state: the run sells, subject to each listing's own state. */
export function newActiveState(options: NewActiveStateOptions = {}) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'new_active_state',
    });
}
export interface NewPausedStateOptions {
    package?: string;
    arguments?: [
    ];
}
/** The paused state: the run sells in no currency. */
export function newPausedState(options: NewPausedStateOptions = {}) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'new_paused_state',
    });
}
export interface NewArguments {
    release: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    state: TransactionArgument;
}
export interface NewOptions {
    package?: string;
    arguments: NewArguments | [
        release: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        state: TransactionArgument
    ];
}
/**
 * Open a release's pressing in `state` — `Scheduled` for a drop moment, `Active`
 * to sell immediately, `Paused` to set it up quietly. Returns it unshared, so the
 * same transaction can list it (`listing::new`) before `share` puts it on chain,
 * plus the cap that governs it from here on. Neither value has `drop`, so neither
 * can be lost by forgetting.
 *
 * Claim-once on `PressingKey()` means a release's pressing can only ever be opened
 * here, exactly once; calling this twice for the same release aborts.
 */
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["release", "cap", "state"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface ShareArguments {
    self: RawTransactionArgument<string>;
}
export interface ShareOptions {
    package?: string;
    arguments: ShareArguments | [
        self: RawTransactionArgument<string>
    ];
}
/**
 * Put the pressing on chain. `new` hands back an unshared `Pressing` so the same
 * transaction can list it first; this is the last call in that sequence.
 */
export function share(options: ShareOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'share',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
}
/**
 * Move the run between its three modes — schedule it, open it, stop it. Takes
 * effect across every currency at once, regardless of any listing's own state.
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
        module: 'pressing',
        function: 'set_state',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface DeriveIdArguments {
    releaseId: RawTransactionArgument<string>;
}
export interface DeriveIdOptions {
    package?: string;
    arguments: DeriveIdArguments | [
        releaseId: RawTransactionArgument<string>
    ];
}
/**
 * The address `release_id`'s pressing occupies — pure address math, computable
 * before the pressing has been opened.
 */
export function deriveId(options: DeriveIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["releaseId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'derive_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
}
export function id(options: IdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
}
export function releaseId(options: ReleaseIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'release_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
}
/** Records pressed so far; also the most recent number. */
export function supply(options: SupplyOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'supply',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface IsSellingArguments {
    self: RawTransactionArgument<string>;
}
export interface IsSellingOptions {
    package?: string;
    arguments: IsSellingArguments | [
        self: RawTransactionArgument<string>
    ];
}
/**
 * Whether the run sells _right now_ — the question `buy` actually asks.
 * `Scheduled` answers it against the clock, so a run past its start that has not
 * yet had a sale to settle it reads as selling, which it is.
 */
export function isSelling(options: IsSellingOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'is_selling',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface PressingAdminCapPressingIdArguments {
    cap: RawTransactionArgument<string>;
}
export interface PressingAdminCapPressingIdOptions {
    package?: string;
    arguments: PressingAdminCapPressingIdArguments | [
        cap: RawTransactionArgument<string>
    ];
}
/**
 * The pressing this cap controls. Public so a custody layer holding the cap can
 * tell what it governs without the `Pressing` object.
 */
export function pressingAdminCapPressingId(options: PressingAdminCapPressingIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["cap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'pressing_admin_cap_pressing_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface VerifyRecordArguments {
    record: RawTransactionArgument<string>;
}
export interface VerifyRecordOptions {
    package?: string;
    arguments: VerifyRecordArguments | [
        record: RawTransactionArgument<string>
    ];
}
/**
 * Whether `record` is genuinely the copy its certificate claims it is, checked
 * from chain state alone and without needing the `Pressing` object.
 *
 * The record must sit at exactly the address its certificate number derives to off
 * its release's pressing. The certificate is the readable form of what the address
 * already proves.
 */
export function verifyRecord(options: VerifyRecordOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["record"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pressing',
        function: 'verify_record',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}