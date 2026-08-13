/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Generic accumulator-based royalty distribution pool.
 * 
 * A `RoyaltyPool<Share, Currency>` is a derived object of any UID-bearing parent.
 * Its address is deterministically derived from `(parent_id, Currency)` — at most
 * one pool per `(parent, Currency)` pair. The `Share` phantom identifies which
 * share-token type can stake against the pool.
 * 
 * Holders create a `Stake<Share>` (see `royalty_pool::stake`) and register it.
 * Callers fund the pool by handing it a `Balance<Currency>` via `deposit`; the
 * accumulator advances and claims pay out the per-stake proportional share since
 * each stake's last claim.
 * 
 * `receive_and_deposit` and `redeem_and_deposit` exist as recovery valves for
 * funds that land directly at the pool's address — either pending `Coin<Currency>`
 * transfers or balances credited to the pool's funds-accumulator. Both are
 * permissionless: anyone who notices stuck funds can fold them in. The canonical
 * funding path remains `deposit(balance)` from a higher-layer extension (e.g.
 * `composition_royalty_distributor`) that pulls from the parent's address.
 */

import { MoveStruct, MoveTuple, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as balance_1 from './deps/sui/balance.js';
const $moduleName = '@local-pkg/royalty_pool::pool';
export const RoyaltyPool = new MoveStruct({ name: `${$moduleName}::RoyaltyPool<phantom Share, phantom Currency>`, fields: {
        id: bcs.Address,
        balance: balance_1.Balance,
        staked_shares: bcs.u64(),
        cumulative_reward_per_share: bcs.u256(),
        /**
         * Lifetime sum of every deposited value, in currency base units. Read-only
         * analytics — never decremented; not used by any on-chain logic.
         */
        cumulative_deposits: bcs.u128()
    } });
export const RoyaltyPoolKey = new MoveTuple({ name: `${$moduleName}::RoyaltyPoolKey<phantom Currency>`, fields: [bcs.bool()] });
export const RoyaltyPoolCreatedEvent = new MoveStruct({ name: `${$moduleName}::RoyaltyPoolCreatedEvent<phantom Share, phantom Currency>`, fields: {
        pool_id: bcs.Address,
        parent_id: bcs.Address
    } });
export const RoyaltyDepositedEvent = new MoveStruct({ name: `${$moduleName}::RoyaltyDepositedEvent<phantom Share, phantom Currency>`, fields: {
        pool_id: bcs.Address,
        value: bcs.u64()
    } });
export const StakeRegisteredEvent = new MoveStruct({ name: `${$moduleName}::StakeRegisteredEvent<phantom Share, phantom Currency>`, fields: {
        pool_id: bcs.Address,
        stake_id: bcs.Address,
        staked_amount: bcs.u64()
    } });
export const StakeUnregisteredEvent = new MoveStruct({ name: `${$moduleName}::StakeUnregisteredEvent<phantom Share, phantom Currency>`, fields: {
        pool_id: bcs.Address,
        stake_id: bcs.Address,
        unstaked_amount: bcs.u64()
    } });
export const RoyaltyClaimedEvent = new MoveStruct({ name: `${$moduleName}::RoyaltyClaimedEvent<phantom Share, phantom Currency>`, fields: {
        pool_id: bcs.Address,
        stake_id: bcs.Address,
        reward_amount: bcs.u64()
    } });
export interface NewArguments {
    parent: RawTransactionArgument<string>;
}
export interface NewOptions {
    package?: string;
    arguments: NewArguments | [
        parent: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Construct a pool as a derived object of `parent`. The derivation key includes
 * only the `Currency` `TypeName`, so the pool's address is determined entirely by
 * `(parent_id, Currency)`.
 *
 * Cap-gating happens at the parent: callers must obtain `&mut UID` via whatever
 * cap-gated accessor the parent exposes.
 */
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["parent"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
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
    typeArguments: [
        string,
        string
    ];
}
/** Share the pool object so holders can register and claim against it. */
export function share(options: ShareOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'share',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface DepositArguments {
    self: RawTransactionArgument<string>;
    balance: TransactionArgument;
}
export interface DepositOptions {
    package?: string;
    arguments: DepositArguments | [
        self: RawTransactionArgument<string>,
        balance: TransactionArgument
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Fold a balance into the accumulator. Aborts on zero staked shares (the deposit
 * would be unattributable) or zero value (no-op deposits are rejected to keep
 * events meaningful).
 *
 * Callers obtain the `Balance<Currency>` however they like — typically by pulling
 * from a parent's pending coins or funds accumulator (see e.g.
 * `composition_royalty_distributor`).
 */
export function deposit(options: DepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "balance"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReceiveAndDepositArguments {
    self: RawTransactionArgument<string>;
    coins: TransactionArgument;
}
export interface ReceiveAndDepositOptions {
    package?: string;
    arguments: ReceiveAndDepositArguments | [
        self: RawTransactionArgument<string>,
        coins: TransactionArgument
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Receive `Coin<Currency>` objects sent directly to this pool's address and fold
 * them into the accumulator. Recovery path for funds delivered to the pool's
 * address rather than via the canonical extension path.
 */
export function receiveAndDeposit(options: ReceiveAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        'vector<null>'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "coins"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'receive_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RedeemAndDepositArguments {
    self: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
}
export interface RedeemAndDepositOptions {
    package?: string;
    arguments: RedeemAndDepositArguments | [
        self: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Redeem `value` base units from the pool's funds-accumulator and fold them into
 * the accumulator. Recovery path for funds delivered via Sui's `send_funds`
 * mechanism rather than via the canonical extension path.
 */
export function redeemAndDeposit(options: RedeemAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "value"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'redeem_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RegisterStakeArguments {
    self: RawTransactionArgument<string>;
    stake: RawTransactionArgument<string>;
}
export interface RegisterStakeOptions {
    package?: string;
    arguments: RegisterStakeArguments | [
        self: RawTransactionArgument<string>,
        stake: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Register a stake with the pool. Records the stake's entry index so future
 * deposits accrue to it proportionally.
 *
 * Aborts if the stake is already registered with a pool of the same Currency.
 */
export function registerStake(options: RegisterStakeOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "stake"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'register_stake',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface UnregisterStakeArguments {
    self: RawTransactionArgument<string>;
    stake: RawTransactionArgument<string>;
}
export interface UnregisterStakeOptions {
    package?: string;
    arguments: UnregisterStakeArguments | [
        self: RawTransactionArgument<string>,
        stake: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Unregister a stake from the pool. All claimable rewards must be drained first —
 * i.e., a final `claim_rewards` call must yield 0. Sub-base-unit residue in
 * `last_claim_index` (left by the consumed-index advance when a reward truncated
 * to 0) does NOT block unregister, since that residue could never be claimed as a
 * whole base unit anyway. Forfeiting it on exit is the deliberate semantics.
 */
export function unregisterStake(options: UnregisterStakeOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "stake"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'unregister_stake',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ClaimRewardsArguments {
    self: RawTransactionArgument<string>;
    stake: RawTransactionArgument<string>;
}
export interface ClaimRewardsOptions {
    package?: string;
    arguments: ClaimRewardsArguments | [
        self: RawTransactionArgument<string>,
        stake: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Claim accrued rewards for a registered stake. Advances the stake's
 * `last_claim_index` to the pool's current accumulator.
 */
export function claimRewards(options: ClaimRewardsOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "stake"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'claim_rewards',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface PendingRewardsArguments {
    self: RawTransactionArgument<string>;
    stake: RawTransactionArgument<string>;
}
export interface PendingRewardsOptions {
    package?: string;
    arguments: PendingRewardsArguments | [
        self: RawTransactionArgument<string>,
        stake: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Compute pending rewards for a stake without claiming. Returns 0 if the stake is
 * not registered with this pool.
 */
export function pendingRewards(options: PendingRewardsOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "stake"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'pending_rewards',
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
        string,
        string
    ];
}
export function id(options: IdOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface BalanceArguments {
    self: RawTransactionArgument<string>;
}
export interface BalanceOptions {
    package?: string;
    arguments: BalanceArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
export function balance(options: BalanceOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'balance',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface StakedSharesArguments {
    self: RawTransactionArgument<string>;
}
export interface StakedSharesOptions {
    package?: string;
    arguments: StakedSharesArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
export function stakedShares(options: StakedSharesOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'staked_shares',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface CumulativeRewardPerShareArguments {
    self: RawTransactionArgument<string>;
}
export interface CumulativeRewardPerShareOptions {
    package?: string;
    arguments: CumulativeRewardPerShareArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
export function cumulativeRewardPerShare(options: CumulativeRewardPerShareOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'cumulative_reward_per_share',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface CumulativeDepositsArguments {
    self: RawTransactionArgument<string>;
}
export interface CumulativeDepositsOptions {
    package?: string;
    arguments: CumulativeDepositsArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/** Lifetime sum of all deposits, in currency base units. Strictly monotonic. */
export function cumulativeDeposits(options: CumulativeDepositsOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'cumulative_deposits',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface DerivedAddressArguments {
    parentId: RawTransactionArgument<string>;
}
export interface DerivedAddressOptions {
    package?: string;
    arguments: DerivedAddressArguments | [
        parentId: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Compute the deterministic address of a pool given its parent ID and `Currency`
 * type parameter. Useful for off-chain derivation and for cross-module checks that
 * the pool was minted from the expected parent.
 */
export function derivedAddress(options: DerivedAddressOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["parentId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'derived_address',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface AssertDerivedFromArguments {
    self: RawTransactionArgument<string>;
    parentId: RawTransactionArgument<string>;
}
export interface AssertDerivedFromOptions {
    package?: string;
    arguments: AssertDerivedFromArguments | [
        self: RawTransactionArgument<string>,
        parentId: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/** Read-only verification that the pool was derived from the given parent ID. */
export function assertDerivedFrom(options: AssertDerivedFromOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "parentId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pool',
        function: 'assert_derived_from',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}