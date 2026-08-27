/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Generic capability custody and plugin authorization.
 * 
 * `Vault<Cap>` is a permanent, deterministically addressed shell that can hold one
 * exact capability in a Sui `Referent`. An authorized plugin receives the whole
 * capability temporarily, paired with a hot-potato `Borrow` receipt that forces
 * the same capability back into the same vault before the transaction can finish.
 * Plugin authorization is represented by a typed dynamic field in the vault's
 * `Bag`.
 */

import { MoveStruct, MoveTuple, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as borrow from './deps/sui/borrow.js';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@local-pkg/vault::vault';
export const VaultRegistry = new MoveStruct({ name: `${$moduleName}::VaultRegistry`, fields: {
        id: bcs.Address
    } });
/**
 * Custodies one capability and the typed authorization records for plugins.
 *
 * `Vault` intentionally lacks `store`: only this module can share it, and no
 * production API can delete it. `cap_id` permanently binds the shell to the exact
 * capability from which its ID was derived. An empty Vault can only be restored
 * with that same capability object.
 */
export function Vault<Cap extends BcsType<any>>(...typeParameters: [
    Cap
]) {
    return new MoveStruct({ name: `${$moduleName}::Vault<${typeParameters[0].name as Cap['name']}>`, fields: {
            id: bcs.Address,
            cap_id: bcs.Address,
            cap: bcs.option(borrow.Referent(typeParameters[0])),
            authorized_plugins: bag.Bag
        } });
}
export const VaultAdminCap = new MoveStruct({ name: `${$moduleName}::VaultAdminCap<phantom Cap>`, fields: {
        id: bcs.Address,
        vault_id: bcs.Address
    } });
export const VaultKey = new MoveTuple({ name: `${$moduleName}::VaultKey<phantom Cap>`, fields: [bcs.Address] });
export const VaultAdminCapKey = new MoveTuple({ name: `${$moduleName}::VaultAdminCapKey`, fields: [bcs.bool()] });
export const AuthorizedPluginKey = new MoveTuple({ name: `${$moduleName}::AuthorizedPluginKey<phantom Witness>`, fields: [bcs.bool()] });
export const VaultRegistryCreatedEvent = new MoveStruct({ name: `${$moduleName}::VaultRegistryCreatedEvent`, fields: {
        registry_id: bcs.Address
    } });
export const VaultCreatedEvent = new MoveStruct({ name: `${$moduleName}::VaultCreatedEvent<phantom Cap>`, fields: {
        vault_id: bcs.Address,
        vault_admin_cap_id: bcs.Address,
        cap_id: bcs.Address,
        authorized_plugins_id: bcs.Address
    } });
export const PluginAuthorizedEvent = new MoveStruct({ name: `${$moduleName}::PluginAuthorizedEvent<phantom Cap, phantom Witness>`, fields: {
        vault_id: bcs.Address
    } });
export const PluginRevokedEvent = new MoveStruct({ name: `${$moduleName}::PluginRevokedEvent<phantom Cap, phantom Witness>`, fields: {
        vault_id: bcs.Address
    } });
export const VaultCapabilityWithdrawnEvent = new MoveStruct({ name: `${$moduleName}::VaultCapabilityWithdrawnEvent<phantom Cap>`, fields: {
        vault_id: bcs.Address,
        cap_id: bcs.Address
    } });
export const VaultCapabilityRestoredEvent = new MoveStruct({ name: `${$moduleName}::VaultCapabilityRestoredEvent<phantom Cap>`, fields: {
        vault_id: bcs.Address,
        cap_id: bcs.Address
    } });
export interface NewArguments<Cap extends BcsType<any>> {
    registry: RawTransactionArgument<string>;
    cap: RawTransactionArgument<Cap>;
}
export interface NewOptions<Cap extends BcsType<any>> {
    package?: string;
    arguments: NewArguments<Cap> | [
        registry: RawTransactionArgument<string>,
        cap: RawTransactionArgument<Cap>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Custody `cap` in its canonical permanent Vault and create the canonical
 * vault-specific administrator capability.
 */
export function _new<Cap extends BcsType<any>>(options: NewOptions<Cap>) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        `${options.typeArguments[0]}`
    ] satisfies (string | null)[];
    const parameterNames = ["registry", "cap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ShareArguments {
    vault: RawTransactionArgument<string>;
}
export interface ShareOptions {
    package?: string;
    arguments: ShareArguments | [
        vault: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Share a newly-created vault. */
export function share(options: ShareOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["vault"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'share',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface TransferAdminCapArguments {
    adminCap: RawTransactionArgument<string>;
    recipient: RawTransactionArgument<string>;
}
export interface TransferAdminCapOptions {
    package?: string;
    arguments: TransferAdminCapArguments | [
        adminCap: RawTransactionArgument<string>,
        recipient: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Transfer exclusive administration without exposing public freeze, share, or
 * wrapping operations for the VaultAdminCap.
 */
export function transferAdminCap(options: TransferAdminCapOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        'address'
    ] satisfies (string | null)[];
    const parameterNames = ["adminCap", "recipient"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'transfer_admin_cap',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface WithdrawCapArguments {
    self: RawTransactionArgument<string>;
    adminCap: RawTransactionArgument<string>;
}
export interface WithdrawCapOptions {
    package?: string;
    arguments: WithdrawCapArguments | [
        self: RawTransactionArgument<string>,
        adminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Withdraw the exact capability while leaving its canonical Vault and
 * VaultAdminCap intact. Every plugin must be revoked first.
 */
export function withdrawCap(options: WithdrawCapOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "adminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'withdraw_cap',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RestoreCapArguments<Cap extends BcsType<any>> {
    self: RawTransactionArgument<string>;
    adminCap: RawTransactionArgument<string>;
    cap: RawTransactionArgument<Cap>;
}
export interface RestoreCapOptions<Cap extends BcsType<any>> {
    package?: string;
    arguments: RestoreCapArguments<Cap> | [
        self: RawTransactionArgument<string>,
        adminCap: RawTransactionArgument<string>,
        cap: RawTransactionArgument<Cap>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Restore the exact capability used to derive this permanent Vault. Restoring
 * always starts from a clean plugin-authorization slate.
 */
export function restoreCap<Cap extends BcsType<any>>(options: RestoreCapOptions<Cap>) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        null,
        `${options.typeArguments[0]}`
    ] satisfies (string | null)[];
    const parameterNames = ["self", "adminCap", "cap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'restore_cap',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface AuthorizePluginArguments<Witness extends BcsType<any>> {
    self: RawTransactionArgument<string>;
    adminCap: RawTransactionArgument<string>;
    _: RawTransactionArgument<Witness>;
}
export interface AuthorizePluginOptions<Witness extends BcsType<any>> {
    package?: string;
    arguments: AuthorizePluginArguments<Witness> | [
        self: RawTransactionArgument<string>,
        adminCap: RawTransactionArgument<string>,
        _: RawTransactionArgument<Witness>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Authorize the package identified by its canonical `witness::Witness` type.
 *
 * The witness is consumed here. A plugin should construct it with a package-only
 * `witness::new()` function.
 */
export function authorizePlugin<Witness extends BcsType<any>>(options: AuthorizePluginOptions<Witness>) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        null,
        `${options.typeArguments[1]}`
    ] satisfies (string | null)[];
    const parameterNames = ["self", "adminCap", "_"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'authorize_plugin',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RevokePluginArguments {
    self: RawTransactionArgument<string>;
    adminCap: RawTransactionArgument<string>;
}
export interface RevokePluginOptions {
    package?: string;
    arguments: RevokePluginArguments | [
        self: RawTransactionArgument<string>,
        adminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/** Revoke a plugin authorization without requiring cooperation from the plugin. */
export function revokePlugin(options: RevokePluginOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "adminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'revoke_plugin',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface BorrowAsPluginArguments<Witness extends BcsType<any>> {
    self: RawTransactionArgument<string>;
    _: RawTransactionArgument<Witness>;
}
export interface BorrowAsPluginOptions<Witness extends BcsType<any>> {
    package?: string;
    arguments: BorrowAsPluginArguments<Witness> | [
        self: RawTransactionArgument<string>,
        _: RawTransactionArgument<Witness>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Temporarily lend the full custodied capability to an authorized plugin.
 *
 * `Borrow` has no abilities, so the exact capability must be returned through
 * `put_back` in this transaction. Aborts if the supplied type is not the exact
 * non-generic `0xpkg::witness::Witness` shape or is not authorized on this Vault.
 */
export function borrowAsPlugin<Witness extends BcsType<any>>(options: BorrowAsPluginOptions<Witness>) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        `${options.typeArguments[1]}`
    ] satisfies (string | null)[];
    const parameterNames = ["self", "_"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'borrow_as_plugin',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface BorrowAsAdminArguments {
    self: RawTransactionArgument<string>;
    adminCap: RawTransactionArgument<string>;
}
export interface BorrowAsAdminOptions {
    package?: string;
    arguments: BorrowAsAdminArguments | [
        self: RawTransactionArgument<string>,
        adminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Temporarily lend the full custodied capability to the vault administrator. */
export function borrowAsAdmin(options: BorrowAsAdminOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "adminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'borrow_as_admin',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface PutBackArguments<Cap extends BcsType<any>> {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<Cap>;
    receipt: TransactionArgument;
}
export interface PutBackOptions<Cap extends BcsType<any>> {
    package?: string;
    arguments: PutBackArguments<Cap> | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<Cap>,
        receipt: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
/**
 * Return the exact capability borrowed from this vault.
 *
 * No additional authorization is required: `Borrow` proves the originating
 * referent and capability object ID, and blocking return would harm liveness.
 */
export function putBack<Cap extends BcsType<any>>(options: PutBackOptions<Cap>) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        `${options.typeArguments[0]}`,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "receipt"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'put_back',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface VaultAddressArguments {
    registry: RawTransactionArgument<string>;
    capId: RawTransactionArgument<string>;
}
export interface VaultAddressOptions {
    package?: string;
    arguments: VaultAddressArguments | [
        registry: RawTransactionArgument<string>,
        capId: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Derive the canonical Vault address for `cap_id` in this registry. */
export function vaultAddress(options: VaultAddressOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["registry", "capId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'vault_address',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface VaultAdminCapAddressArguments {
    vaultId: RawTransactionArgument<string>;
}
export interface VaultAdminCapAddressOptions {
    package?: string;
    arguments: VaultAdminCapAddressArguments | [
        vaultId: RawTransactionArgument<string>
    ];
}
/** Derive the canonical VaultAdminCap address for a Vault ID. */
export function vaultAdminCapAddress(options: VaultAdminCapAddressOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["vaultId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'vault_admin_cap_address',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface VaultIdArguments {
    self: RawTransactionArgument<string>;
}
export interface VaultIdOptions {
    package?: string;
    arguments: VaultIdArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function vaultId(options: VaultIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'vault_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface CapIdArguments {
    self: RawTransactionArgument<string>;
}
export interface CapIdOptions {
    package?: string;
    arguments: CapIdArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** The exact capability object permanently assigned to this Vault. */
export function capId(options: CapIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'cap_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IsOccupiedArguments {
    self: RawTransactionArgument<string>;
}
export interface IsOccupiedOptions {
    package?: string;
    arguments: IsOccupiedArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Whether the permanent outer capability slot is occupied.
 *
 * This is the persistent-state custody view. It remains true during a
 * transaction-local lease even though the inner Referent is temporarily empty.
 */
export function isOccupied(options: IsOccupiedOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'is_occupied',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface AuthorizedPluginsIdArguments {
    self: RawTransactionArgument<string>;
}
export interface AuthorizedPluginsIdOptions {
    package?: string;
    arguments: AuthorizedPluginsIdArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** The ID under which `AuthorizedPluginKey` records are dynamic fields. */
export function authorizedPluginsId(options: AuthorizedPluginsIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'authorized_plugins_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface AuthorizedPluginCountArguments {
    self: RawTransactionArgument<string>;
}
export interface AuthorizedPluginCountOptions {
    package?: string;
    arguments: AuthorizedPluginCountArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function authorizedPluginCount(options: AuthorizedPluginCountOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'authorized_plugin_count',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IsPluginAuthorizedArguments {
    self: RawTransactionArgument<string>;
}
export interface IsPluginAuthorizedOptions {
    package?: string;
    arguments: IsPluginAuthorizedArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Returns whether this witness type has an authorization record.
 *
 * This deliberately does not validate the witness shape: arbitrary types simply
 * report false, while `authorize_plugin` is the only way to add one.
 */
export function isPluginAuthorized(options: IsPluginAuthorizedOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'is_plugin_authorized',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}