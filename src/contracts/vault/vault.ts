/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Generic capability custody and plugin authorization.
 * 
 * `Vault<Cap>` holds a capability in a Sui `Referent`. An authorized plugin
 * receives the whole capability temporarily, paired with a hot-potato `Borrow`
 * receipt that forces the same capability back into the same vault before the
 * transaction can finish. Plugin authorization is represented by a typed dynamic
 * field in the vault's `Bag`.
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, MoveTuple, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as borrow from './deps/sui/borrow.js';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@local-pkg/vault::vault';
/**
 * Custodies one capability and the typed authorization records for plugins.
 *
 * `Vault` intentionally lacks `store`: only this module can share or destroy it.
 * The wrapped capability is never exposed except through a hot-potato borrow that
 * requires its exact return.
 */
export function Vault<Cap extends BcsType<any>>(...typeParameters: [
    Cap
]) {
    return new MoveStruct({ name: `${$moduleName}::Vault<${typeParameters[0].name as Cap['name']}>`, fields: {
            id: bcs.Address,
            cap: borrow.Referent(typeParameters[0]),
            authorized_plugins: bag.Bag
        } });
}
export const VaultAdminCap = new MoveStruct({ name: `${$moduleName}::VaultAdminCap<phantom Cap>`, fields: {
        id: bcs.Address,
        vault_id: bcs.Address
    } });
export const AuthorizedPluginKey = new MoveTuple({ name: `${$moduleName}::AuthorizedPluginKey<phantom Witness>`, fields: [bcs.bool()] });
export const VaultCreatedEvent = new MoveStruct({ name: `${$moduleName}::VaultCreatedEvent<phantom Cap>`, fields: {
        vault_id: bcs.Address,
        vault_admin_cap_id: bcs.Address,
        wrapped_cap_id: bcs.Address,
        authorized_plugins_id: bcs.Address
    } });
export const PluginAuthorizedEvent = new MoveStruct({ name: `${$moduleName}::PluginAuthorizedEvent<phantom Cap, phantom Witness>`, fields: {
        vault_id: bcs.Address
    } });
export const PluginRevokedEvent = new MoveStruct({ name: `${$moduleName}::PluginRevokedEvent<phantom Cap, phantom Witness>`, fields: {
        vault_id: bcs.Address
    } });
export const VaultDestroyedEvent = new MoveStruct({ name: `${$moduleName}::VaultDestroyedEvent<phantom Cap>`, fields: {
        vault_id: bcs.Address,
        wrapped_cap_id: bcs.Address
    } });
export interface NewArguments<Cap extends BcsType<any>> {
    cap: RawTransactionArgument<Cap>;
}
export interface NewOptions<Cap extends BcsType<any>> {
    package?: string;
    arguments: NewArguments<Cap> | [
        cap: RawTransactionArgument<Cap>
    ];
    typeArguments: [
        string
    ];
}
/** Custody `cap` and create its vault-specific administrator capability. */
export function _new<Cap extends BcsType<any>>(options: NewOptions<Cap>) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        `${options.typeArguments[0]}`
    ] satisfies (string | null)[];
    const parameterNames = ["cap"];
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
export interface DestroyArguments {
    self: RawTransactionArgument<string>;
    adminCap: RawTransactionArgument<string>;
}
export interface DestroyOptions {
    package?: string;
    arguments: DestroyArguments | [
        self: RawTransactionArgument<string>,
        adminCap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Destroy an empty vault and return the exact capability it custodied. */
export function destroy(options: DestroyOptions) {
    const packageAddress = options.package ?? '@local-pkg/vault';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "adminCap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'destroy',
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