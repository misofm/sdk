/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Vault-authorized royalty-pool business logic for Miso Recordings.
 * 
 * The plugin temporarily leases the RecordingAdminCap from its Vault, uses it only
 * to reach the matching Recording UID, and returns it before calling external pool
 * logic. Pools remain derived from the Recording, not the Vault, so their
 * canonical identity survives vault replacement.
 */

import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface InstallArguments {
    vault: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
}
export interface InstallOptions {
    package?: string;
    arguments: InstallArguments | [
        vault: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Authorize this package on a Recording capability Vault. */
export function install(options: InstallOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'install',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface UninstallArguments {
    vault: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
}
export interface UninstallOptions {
    package?: string;
    arguments: UninstallArguments | [
        vault: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Revoke this package from a Recording capability Vault. */
export function uninstall(options: UninstallOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'uninstall',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface InitializePoolArguments {
    vault: RawTransactionArgument<string>;
    recording: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
}
export interface InitializePoolOptions {
    package?: string;
    arguments: InitializePoolArguments | [
        vault: RawTransactionArgument<string>,
        recording: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/**
 * Create and share the canonical pool derived from this Recording.
 *
 * The matching VaultAdminCap chooses which Currency pools may be created. The
 * result cannot be redirected: the pool ID is claimed from the Recording UID and
 * is typed by both RecordingShare and Currency.
 */
export function initializePool(options: InitializePoolOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "recording", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'initialize_pool',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReceiveAndDepositArguments {
    vault: RawTransactionArgument<string>;
    recording: RawTransactionArgument<string>;
    pool: RawTransactionArgument<string>;
    coins: TransactionArgument;
}
export interface ReceiveAndDepositOptions {
    package?: string;
    arguments: ReceiveAndDepositArguments | [
        vault: RawTransactionArgument<string>,
        recording: RawTransactionArgument<string>,
        pool: RawTransactionArgument<string>,
        coins: TransactionArgument
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/**
 * Receive coins sent to the Recording and deposit them into its canonical pool.
 * Anyone may crank this after the plugin is installed, but the funds can only
 * reach the pool derived from this Recording.
 */
export function receiveAndDeposit(options: ReceiveAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        null,
        'vector<null>'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "recording", "pool", "coins"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'receive_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RedeemAndDepositArguments {
    vault: RawTransactionArgument<string>;
    recording: RawTransactionArgument<string>;
    pool: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
}
export interface RedeemAndDepositOptions {
    package?: string;
    arguments: RedeemAndDepositArguments | [
        vault: RawTransactionArgument<string>,
        recording: RawTransactionArgument<string>,
        pool: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/**
 * Redeem funds accumulated at the Recording address and deposit them into its
 * canonical pool. Anyone may crank this after installation.
 */
export function redeemAndDeposit(options: RedeemAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "recording", "pool", "value"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'redeem_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IsInstalledArguments {
    vault: RawTransactionArgument<string>;
}
export interface IsInstalledOptions {
    package?: string;
    arguments: IsInstalledArguments | [
        vault: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function isInstalled(options: IsInstalledOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'is_installed',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface PoolAddressArguments {
    recording: RawTransactionArgument<string>;
}
export interface PoolAddressOptions {
    package?: string;
    arguments: PoolAddressArguments | [
        recording: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/** The canonical pool address for this Recording, share type, and Currency. */
export function poolAddress(options: PoolAddressOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["recording"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_royalty_pool',
        function: 'pool_address',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}