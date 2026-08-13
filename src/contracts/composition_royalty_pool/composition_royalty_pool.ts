/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Cap-gated royalty-pool extension for `Composition`.
 * 
 * Royalty payers send `Coin<Currency>` directly to the composition's address — a
 * stable, well-known inbox available from the composition's creation. The
 * composition admin (cap holder) folds those funds into the underlying
 * `royalty_pool::pool::RoyaltyPool` via `receive_and_deposit` (for direct coin
 * transfers) or `redeem_and_deposit` (for funds-accumulator balances).
 * 
 * All three entry points require `&CompositionAdminCap`, so timing of fold
 * operations stays under admin control.
 */

import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface InitializePoolArguments {
    composition: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
}
export interface InitializePoolOptions {
    package?: string;
    arguments: InitializePoolArguments | [
        composition: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Create a royalty pool for a composition. Pool address derives from
 * `(composition_id, Currency)` — calling twice with the same Currency aborts
 * because the address is already claimed.
 */
export function initializePool(options: InitializePoolOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["composition", "cap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'initialize_pool',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReceiveAndDepositArguments {
    composition: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    coins: TransactionArgument;
    pool: RawTransactionArgument<string>;
}
export interface ReceiveAndDepositOptions {
    package?: string;
    arguments: ReceiveAndDepositArguments | [
        composition: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        coins: TransactionArgument,
        pool: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Receive `Coin<Currency>` objects sent to the composition's address and fold them
 * into the pool's accumulator.
 */
export function receiveAndDeposit(options: ReceiveAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        'vector<null>',
        null
    ] satisfies (string | null)[];
    const parameterNames = ["composition", "cap", "coins", "pool"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'receive_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RedeemAndDepositArguments {
    composition: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
    pool: RawTransactionArgument<string>;
}
export interface RedeemAndDepositOptions {
    package?: string;
    arguments: RedeemAndDepositArguments | [
        composition: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>,
        pool: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Redeem `value` base units from the composition's funds accumulator and fold the
 * resulting balance into the pool's accumulator.
 */
export function redeemAndDeposit(options: RedeemAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        'u64',
        null
    ] satisfies (string | null)[];
    const parameterNames = ["composition", "cap", "value", "pool"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'redeem_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}