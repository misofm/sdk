/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Vault-authorized withdrawals from a Party's object inbox and funds accumulator.
 *
 * Anyone may address objects or funds to a Party ID. This plugin is the bounded
 * withdrawal door: it temporarily leases the matching `PartyAdminCap`, uses it
 * only to reach that Party's UID, returns it to the Vault, and then transfers the
 * withdrawn object or coin to the recipient selected by the Vault administrator.
 *
 * Installation alone never makes withdrawals permissionless. Every production
 * withdrawal is an `entry fun` requiring the matching `VaultAdminCap`, and no
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
    recipient: RawTransactionArgument<string>;
}
export interface ReceiveCoinsOptions {
    package?: string;
    arguments: ReceiveCoinsArguments | [
        vault: RawTransactionArgument<string>,
        party: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>,
        coins: TransactionArgument,
        recipient: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Receive coin objects of one currency, merge them, and transfer the resulting
 * Coin to `recipient`.
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
        'vector<null>',
        'address'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "party", "vaultAdminCap", "coins", "recipient"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'receive_coins',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RedeemCoinArguments {
    vault: RawTransactionArgument<string>;
    party: RawTransactionArgument<string>;
    vaultAdminCap: RawTransactionArgument<string>;
    value: RawTransactionArgument<number | bigint>;
    recipient: RawTransactionArgument<string>;
}
export interface RedeemCoinOptions {
    package?: string;
    arguments: RedeemCoinArguments | [
        vault: RawTransactionArgument<string>,
        party: RawTransactionArgument<string>,
        vaultAdminCap: RawTransactionArgument<string>,
        value: RawTransactionArgument<number | bigint>,
        recipient: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Redeem `value` from the Party's accumulator balance, create a Coin, and transfer
 * it to `recipient`.
 *
 * Aborts if the Vault administrator is wrong, the plugin is not installed, the
 * Vault contains another Party's cap, `value` is zero, or the accumulator cannot
 * cover the requested amount.
 */
export function redeemCoin(options: RedeemCoinOptions) {
    const packageAddress = options.package ?? '@local-pkg/party_wallet';
    const argumentsTypes = [
        null,
        null,
        null,
        'u64',
        'address'
    ] satisfies (string | null)[];
    const parameterNames = ["vault", "party", "vaultAdminCap", "value", "recipient"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'party_wallet',
        function: 'redeem_coin',
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