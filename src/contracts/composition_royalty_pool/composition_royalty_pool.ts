/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Vault-authorized royalty-pool business logic for Miso Compositions.
 * 
 * The plugin temporarily leases the CompositionAdminCap from its Vault, uses it
 * only to reach the matching Composition UID, and returns it before calling
 * external pool logic. Pools remain derived from the Composition, not the Vault,
 * so their canonical identity survives vault replacement.
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
/** Authorize this package on a Composition capability Vault. */
export function install(options: InstallOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
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
/** Revoke this package from a Composition capability Vault. */
export function uninstall(options: UninstallOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'uninstall',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface InitializePoolArguments {
    vault: RawTransactionArgument<string>;
    composition: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
}
export interface InitializePoolOptions {
    package?: string;
    arguments: InitializePoolArguments | [
        vault: RawTransactionArgument<string>,
        composition: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Create and share the canonical pool derived from this Composition.
 *
 * The matching VaultAdminCap chooses which Currency pools may be created. The
 * result cannot be redirected: the pool ID is claimed from the Composition UID and
 * is typed by both CompositionShare and Currency.
 */
export function initializePool(options: InitializePoolOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "composition", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'initialize_pool',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReceiveAndDepositArguments {
    vault: RawTransactionArgument<string>;
    composition: RawTransactionArgument<string>;
    pool: RawTransactionArgument<string>;
    coins: TransactionArgument;
}
export interface ReceiveAndDepositOptions {
    package?: string;
    arguments: ReceiveAndDepositArguments | [
        vault: RawTransactionArgument<string>,
        composition: RawTransactionArgument<string>,
        pool: RawTransactionArgument<string>,
        coins: TransactionArgument
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Receive coins sent to the Composition and deposit them into its canonical pool.
 * Anyone may crank this after the plugin is installed, but the funds can only
 * reach the pool derived from this Composition.
 */
export function receiveAndDeposit(options: ReceiveAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        null,
        'vector<null>'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "composition", "pool", "coins"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'receive_and_deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface SweepAndDepositArguments {
    vault: RawTransactionArgument<string>;
    composition: RawTransactionArgument<string>;
    pool: RawTransactionArgument<string>;
    root: RawTransactionArgument<string>;
}
export interface SweepAndDepositOptions {
    package?: string;
    arguments: SweepAndDepositArguments | [
        vault: RawTransactionArgument<string>,
        composition: RawTransactionArgument<string>,
        pool: RawTransactionArgument<string>,
        root: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Redeem the Currency funds settled at the Composition address at the start of
 * this consensus commit and deposit the balance into its canonical pool. Each call
 * sweeps at most `u64::MAX`; a larger settled balance requires repeated calls.
 * Anyone may crank this after installation. Aborts with `ENoSettledFunds` if no
 * positive balance is currently eligible to sweep.
 */
export function sweepAndDeposit(options: SweepAndDepositOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null,
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "composition", "pool", "root"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'sweep_and_deposit',
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
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'is_installed',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface PoolAddressArguments {
    composition: RawTransactionArgument<string>;
}
export interface PoolAddressOptions {
    package?: string;
    arguments: PoolAddressArguments | [
        composition: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/** The canonical pool address for this Composition, share type, and Currency. */
export function poolAddress(options: PoolAddressOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["composition"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_royalty_pool',
        function: 'pool_address',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}