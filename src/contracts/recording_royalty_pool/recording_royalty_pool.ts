/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Cap-gated royalty-pool extension for `Recording`.
 * 
 * Royalty payers send `Coin<Currency>` directly to the recording's address — a
 * stable, well-known inbox available from the recording's creation. The recording
 * admin (cap holder) folds those funds into the underlying
 * `royalty_pool::pool::RoyaltyPool` via `receive_and_deposit` (for direct coin
 * transfers) or `redeem_and_deposit` (for funds-accumulator balances).
 * 
 * All three entry points require `&RecordingAdminCap`, so timing of fold
 * operations stays under admin control.
 */

import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface InitializePoolArguments {
    recording: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
}
export interface InitializePoolOptions {
    package?: string;
    arguments: InitializePoolArguments | [
        recording: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/**
 * Create a royalty pool for a recording. Pool address derives from
 * `(recording_id, Currency)` — calling twice with the same Currency aborts because
 * the address is already claimed.
 */
export function initializePool(options: InitializePoolOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["recording", "cap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'initialize_pool',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReceiveAndDepositArguments {
    recording: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    coins: TransactionArgument;
    pool: RawTransactionArgument<string>;
}
export interface ReceiveAndDepositOptions {
    package?: string;
    arguments: ReceiveAndDepositArguments | [
        recording: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        coins: TransactionArgument,
        pool: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/**
 * Receive `Coin<Currency>` objects sent to the recording's address and fold them
 * into the pool's accumulator.
 */
export function receiveAndDeposit(options: ReceiveAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        'vector<null>',
        null
    ] satisfies (string | null)[];
    const parameterNames = ["recording", "cap", "coins", "pool"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'receive_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RedeemAndDepositArguments {
    recording: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
    pool: RawTransactionArgument<string>;
}
export interface RedeemAndDepositOptions {
    package?: string;
    arguments: RedeemAndDepositArguments | [
        recording: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>,
        pool: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/**
 * Redeem `value` base units from the recording's funds accumulator and fold the
 * resulting balance into the pool's accumulator.
 */
export function redeemAndDeposit(options: RedeemAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        'u64',
        null
    ] satisfies (string | null)[];
    const parameterNames = ["recording", "cap", "value", "pool"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'redeem_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}