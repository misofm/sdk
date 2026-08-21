/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Vault-authorized control over Recording shares owned by a Composition.
 * 
 * The plugin redeems Recording shares held at the Composition address and places
 * them in a generic `routed_stake::RoutedStake`. The independently shared wrapper
 * prevents rewards from surfacing as freely claimable funds: its permissionless
 * `sweep` operation can route them only into the royalty pool derived from the
 * same Composition.
 */

import { type Transaction } from '@mysten/sui/transactions';
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
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
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
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
        function: 'uninstall',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface CreateStakeArguments {
    vault: RawTransactionArgument<string>;
    composition: RawTransactionArgument<string>;
    Recording: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
}
export interface CreateStakeOptions {
    package?: string;
    arguments: CreateStakeArguments | [
        vault: RawTransactionArgument<string>,
        composition: RawTransactionArgument<string>,
        Recording: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Redeem Composition-owned Recording shares, create the Composition-derived routed
 * stake, and share it. The Recording reference pins both share types to a real
 * Composition/Recording relationship.
 */
export function createStake(options: CreateStakeOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "composition", "Recording", "vaultAdminCap", "value"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
        function: 'create_stake',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RegisterArguments {
    vault: RawTransactionArgument<string>;
    composition: RawTransactionArgument<string>;
    recording: RawTransactionArgument<string>;
    routed: RawTransactionArgument<string>;
    pool: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
}
export interface RegisterOptions {
    package?: string;
    arguments: RegisterArguments | [
        vault: RawTransactionArgument<string>,
        composition: RawTransactionArgument<string>,
        recording: RawTransactionArgument<string>,
        routed: RawTransactionArgument<string>,
        pool: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/**
 * Register the routed stake with the canonical pool derived from the supplied
 * Recording. The Vault administrator controls which currencies are enabled.
 */
export function register(options: RegisterOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "composition", "recording", "routed", "pool", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
        function: 'register',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface UnregisterArguments {
    vault: RawTransactionArgument<string>;
    composition: RawTransactionArgument<string>;
    routed: RawTransactionArgument<string>;
    pool: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
}
export interface UnregisterOptions {
    package?: string;
    arguments: UnregisterArguments | [
        vault: RawTransactionArgument<string>,
        composition: RawTransactionArgument<string>,
        routed: RawTransactionArgument<string>,
        pool: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string,
        string
    ];
}
/** Unregister the routed stake after its pending reward has been swept. */
export function unregister(options: UnregisterOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "composition", "routed", "pool", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
        function: 'unregister',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface UnstakeArguments {
    vault: RawTransactionArgument<string>;
    composition: RawTransactionArgument<string>;
    routed: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
}
export interface UnstakeOptions {
    package?: string;
    arguments: UnstakeArguments | [
        vault: RawTransactionArgument<string>,
        composition: RawTransactionArgument<string>,
        routed: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Remove the routed position and return its principal to the Composition address.
 * Principal never becomes a caller-controlled Coin or Balance.
 */
export function unstake(options: UnstakeOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null,
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "composition", "routed", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
        function: 'unstake',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RestakeArguments {
    vault: RawTransactionArgument<string>;
    composition: RawTransactionArgument<string>;
    routed: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
}
export interface RestakeOptions {
    package?: string;
    arguments: RestakeArguments | [
        vault: RawTransactionArgument<string>,
        composition: RawTransactionArgument<string>,
        routed: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Refill an empty routed stake from Recording shares held at the Composition
 * address.
 */
export function restake(options: RestakeOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "composition", "routed", "vaultAdminCap", "value"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
        function: 'restake',
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
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
        function: 'is_installed',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface StakeAddressArguments {
    composition: RawTransactionArgument<string>;
}
export interface StakeAddressOptions {
    package?: string;
    arguments: StakeAddressArguments | [
        composition: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/** Canonical routed-stake address for this Composition and RecordingShare. */
export function stakeAddress(options: StakeAddressOptions) {
    const packageAddress = options.package ?? '@local-pkg/composition_routed_stake';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["composition"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'composition_routed_stake',
        function: 'stake_address',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}