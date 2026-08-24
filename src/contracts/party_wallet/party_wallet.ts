/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Vault-authorized withdrawals from a Party's object inbox and funds accumulator.
 *
 * Anyone may address objects or funds to a Party ID. This plugin is the bounded
 * withdrawal door: it temporarily leases the matching `PartyAdminCap`, uses it
 * only to reach that Party's UID, and returns it to the Vault. Object withdrawals
 * transfer to the recipient selected by the Vault administrator; monetary
 * withdrawals return a composable `Balance` for the caller's PTB to consume.
 *
 * Installation alone never makes withdrawals permissionless. Every production
 * withdrawal is a `public fun` requiring the matching `VaultAdminCap`, and no
 * endpoint returns the leased capability, its borrow receipt, or a privileged
 * reference. The Party itself stores no plugin data.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/party_wallet::party_wallet';
export const ObjectReceivedEvent = new MoveStruct({ name: `${$moduleName}::ObjectReceivedEvent`, fields: {
        party_id: bcs.Address,
        object_id: bcs.Address
    } });
export const CoinsReceivedEvent = new MoveStruct({ name: `${$moduleName}::CoinsReceivedEvent<phantom Currency>`, fields: {
        party_id: bcs.Address,
        amount: bcs.u64(),
        coins: bcs.u64()
    } });
export const FundsRedeemedEvent = new MoveStruct({ name: `${$moduleName}::FundsRedeemedEvent<phantom Currency>`, fields: {
        party_id: bcs.Address,
        amount: bcs.u64()
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
/** Authorize this package on a Party capability Vault. */
export function install(options: InstallOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
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
/** Revoke this package from a Party capability Vault. */
export function uninstall(options: UninstallOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'uninstall',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface ReceiveObjectArguments {
    vault: RawTransactionArgument<string>;
    party: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
    objectToReceive: TransactionArgument;
    recipient: RawTransactionArgument<string>;
}
export interface ReceiveObjectOptions {
    package?: string;
    arguments: ReceiveObjectArguments | [
        vault: RawTransactionArgument<string>,
        party: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>,
        objectToReceive: TransactionArgument,
        recipient: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Receive one `key + store` object addressed to the Party and transfer it to
 * `recipient`.
 *
 * Aborts if the Vault administrator is wrong, the plugin is not installed, the
 * Vault contains another Party's cap, or the receiving ticket is invalid for the
 * supplied Party.
 */
export function receiveObject(options: ReceiveObjectOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        'address'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "party", "vaultAdminCap", "objectToReceive", "recipient"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'receive_object',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReceiveObjectsArguments {
    vault: RawTransactionArgument<string>;
    party: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
    objectsToReceive: TransactionArgument;
    recipient: RawTransactionArgument<string>;
}
export interface ReceiveObjectsOptions {
    package?: string;
    arguments: ReceiveObjectsArguments | [
        vault: RawTransactionArgument<string>,
        party: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>,
        objectsToReceive: TransactionArgument,
        recipient: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Receive several `key + store` objects of one type and transfer each to
 * `recipient` in input order.
 *
 * Aborts with `ENothingToReceive` if `objects_to_receive` is empty. It also aborts
 * under the authorization and receiving conditions documented by `receive_object`.
 */
export function receiveObjects(options: ReceiveObjectsOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null,
        null,
        'vector<null>',
        'address'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "party", "vaultAdminCap", "objectsToReceive", "recipient"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'receive_objects',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ReceiveCoinsArguments {
    vault: RawTransactionArgument<string>;
    party: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
    coins: TransactionArgument;
}
export interface ReceiveCoinsOptions {
    package?: string;
    arguments: ReceiveCoinsArguments | [
        vault: RawTransactionArgument<string>,
        party: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>,
        coins: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
/**
 * Receive coin objects of one currency, merge them, and return their combined
 * Balance for the caller's PTB to consume.
 *
 * Aborts with `ENothingToReceive` if `coins` is empty. It also aborts if the Vault
 * administrator, plugin installation, Party capability, or a receiving ticket is
 * invalid.
 */
export function receiveCoins(options: ReceiveCoinsOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null,
        null,
        'vector<null>'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "party", "vaultAdminCap", "coins"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'receive_coins',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RedeemBalanceArguments {
    vault: RawTransactionArgument<string>;
    party: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
}
export interface RedeemBalanceOptions {
    package?: string;
    arguments: RedeemBalanceArguments | [
        vault: RawTransactionArgument<string>,
        party: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Redeem `value` from the Party's accumulator and return a Balance for the
 * caller's PTB to consume.
 *
 * Aborts if the Vault administrator is wrong, the plugin is not installed, the
 * Vault contains another Party's cap, `value` is zero, or the accumulator cannot
 * cover the requested amount.
 */
export function redeemBalance(options: RedeemBalanceOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "party", "vaultAdminCap", "value"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'redeem_balance',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface SweepBalanceArguments {
    vault: RawTransactionArgument<string>;
    party: RawTransactionArgument<string>;
    root: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
}
export interface SweepBalanceOptions {
    package?: string;
    arguments: SweepBalanceArguments | [
        vault: RawTransactionArgument<string>,
        party: RawTransactionArgument<string>,
        root: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Redeem the settled `Currency` amount reported for the Party address and return a
 * Balance for the caller's PTB to consume.
 *
 * Funds sent during the current consensus commit are not yet settled and remain
 * available for a later sweep. Aborts with `ENoSettledFunds` when the settled
 * amount is zero. The framework caps the reported amount at `u64::MAX`; any excess
 * remains for a later sweep.
 */
export function sweepBalance(options: SweepBalanceOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "party", "root", "vaultAdminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'sweep_balance',
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
/** Return whether this plugin is installed on `vault`. */
export function isInstalled(options: IsInstalledOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'is_installed',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface InboxAddressArguments {
    party: RawTransactionArgument<string>;
}
export interface InboxAddressOptions {
    package?: string;
    arguments: InboxAddressArguments | [
        party: RawTransactionArgument<string>
    ];
}
/** Return the Party ID as the address to which objects or funds may be sent. */
export function inboxAddress(options: InboxAddressOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["party"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'inbox_address',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface SettledFundsArguments {
    root: RawTransactionArgument<string>;
    party: RawTransactionArgument<string>;
}
export interface SettledFundsOptions {
    package?: string;
    arguments: SettledFundsArguments | [
        root: RawTransactionArgument<string>,
        party: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Return the Party's accumulator balance settled at the start of the current
 * consensus commit.
 */
export function settledFunds(options: SettledFundsOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["root", "party"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'settled_funds',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}