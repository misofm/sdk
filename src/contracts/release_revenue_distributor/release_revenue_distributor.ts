/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Vault-authorized release revenue routing for Miso.
 * 
 * Revenue is split from the immutable Release tracklist and sent to each track's
 * Recording address. A caller can select only the funds to receive or the amount
 * to redeem; it cannot select recipients or alter split amounts. Recording-level
 * plugins may subsequently fold those funds into canonical Recording royalty
 * pools.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/release_revenue_distributor::release_revenue_distributor';
export const ReleaseTrackRevenueDistributedEvent = new MoveStruct({ name: `${$moduleName}::ReleaseTrackRevenueDistributedEvent<phantom Currency>`, fields: {
        release_id: bcs.Address,
        track_index: bcs.u64(),
        recording_id: bcs.Address,
        amount: bcs.u64()
    } });
export const ReleaseRevenueDistributedEvent = new MoveStruct({ name: `${$moduleName}::ReleaseRevenueDistributedEvent<phantom Currency>`, fields: {
        release_id: bcs.Address,
        total_input: bcs.u64(),
        total_distributed: bcs.u64(),
        remainder: bcs.u64()
    } });
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
}
/** Authorize this package on a Release capability Vault. */
export function install(options: InstallOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_revenue_distributor';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_revenue_distributor',
        function: 'install',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
}
/** Revoke this package from a Release capability Vault. */
export function uninstall(options: UninstallOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_revenue_distributor';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_revenue_distributor',
        function: 'uninstall',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface RedeemAndDistributeArguments {
    vault: RawTransactionArgument<string>;
    release: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
}
export interface RedeemAndDistributeOptions {
    package?: string;
    arguments: RedeemAndDistributeArguments | [
        vault: RawTransactionArgument<string>,
        release: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Redeem `value` from the Release address and distribute it according to the
 * immutable tracklist. Anyone may crank this after installation.
 */
export function redeemAndDistribute(options: RedeemAndDistributeOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_revenue_distributor';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "release", "value"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_revenue_distributor',
        function: 'redeem_and_distribute',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReceiveAndDistributeArguments {
    vault: RawTransactionArgument<string>;
    release: RawTransactionArgument<string>;
    coins: TransactionArgument;
}
export interface ReceiveAndDistributeOptions {
    package?: string;
    arguments: ReceiveAndDistributeArguments | [
        vault: RawTransactionArgument<string>,
        release: RawTransactionArgument<string>,
        coins: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
/**
 * Receive selected `Coin<Currency>` objects sent to the Release and distribute
 * their combined value according to the immutable tracklist. Anyone may crank this
 * after installation.
 */
export function receiveAndDistribute(options: ReceiveAndDistributeOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_revenue_distributor';
    const argumentsTypes = [
        null,
        null,
        'vector<null>'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "release", "coins"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_revenue_distributor',
        function: 'receive_and_distribute',
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
}
export function isInstalled(options: IsInstalledOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_revenue_distributor';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_revenue_distributor',
        function: 'is_installed',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}