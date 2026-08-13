/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * A position holding share tokens registered against a `RoyaltyPool`.
 * 
 * Stakes are owned objects with an immutable balance — to increase a holder's
 * total staked amount, mint additional Stake objects rather than modify an
 * existing one. This mirrors Sui's native staking model.
 * 
 * Each stake tracks the royalty pools it is currently registered with via an
 * inline `VecMap<TypeName, Registration>`, keyed by the pool's `Currency`
 * `TypeName`. The stake cannot be destroyed while any registrations remain. Pool
 * registrations are mutated by `royalty_pool::pool` through the package-private
 * accessors below.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as balance_1 from './deps/sui/balance.js';
import * as vec_map from './deps/sui/vec_map.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@local-pkg/royalty_pool::stake';
export const Registration = new MoveStruct({ name: `${$moduleName}::Registration`, fields: {
        pool_id: bcs.Address,
        last_claim_index: bcs.u256()
    } });
export const Stake = new MoveStruct({ name: `${$moduleName}::Stake<phantom Share>`, fields: {
        id: bcs.Address,
        /** The staked balance. Immutable after creation. */
        balance: balance_1.Balance,
        /**
         * Active royalty-pool registrations, keyed by `Currency` `TypeName`. Must be empty
         * to destroy.
         */
        registrations: vec_map.VecMap(type_name.TypeName, Registration)
    } });
export const StakeCreatedEvent = new MoveStruct({ name: `${$moduleName}::StakeCreatedEvent<phantom Share>`, fields: {
        stake_id: bcs.Address,
        amount: bcs.u64()
    } });
export const StakeDestroyedEvent = new MoveStruct({ name: `${$moduleName}::StakeDestroyedEvent<phantom Share>`, fields: {
        stake_id: bcs.Address,
        amount: bcs.u64()
    } });
export interface NewArguments {
    balance: TransactionArgument;
}
export interface NewOptions {
    package?: string;
    arguments: NewArguments | [
        balance: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
/**
 * Create a new stake with the given balance.
 *
 * Aborts if `balance` is zero.
 */
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["balance"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface DestroyArguments {
    stake: RawTransactionArgument<string>;
}
export interface DestroyOptions {
    package?: string;
    arguments: DestroyArguments | [
        stake: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Destroy a stake and reclaim its balance.
 *
 * Aborts if the stake is still registered with any royalty pools.
 */
export function destroy(options: DestroyOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["stake"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'destroy',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IdArguments {
    self: RawTransactionArgument<string>;
}
export interface IdOptions {
    package?: string;
    arguments: IdArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function id(options: IdOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface BalanceArguments {
    self: RawTransactionArgument<string>;
}
export interface BalanceOptions {
    package?: string;
    arguments: BalanceArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function balance(options: BalanceOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'balance',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface ValueArguments {
    self: RawTransactionArgument<string>;
}
export interface ValueOptions {
    package?: string;
    arguments: ValueArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function value(options: ValueOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'value',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RegistrationCountArguments {
    self: RawTransactionArgument<string>;
}
export interface RegistrationCountOptions {
    package?: string;
    arguments: RegistrationCountArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Number of royalty pools this stake is currently registered with. */
export function registrationCount(options: RegistrationCountOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'registration_count',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface HasRegistrationArguments {
    self: RawTransactionArgument<string>;
    currency: TransactionArgument;
}
export interface HasRegistrationOptions {
    package?: string;
    arguments: HasRegistrationArguments | [
        self: RawTransactionArgument<string>,
        currency: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
export function hasRegistration(options: HasRegistrationOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "currency"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'has_registration',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface GetRegistrationArguments {
    self: RawTransactionArgument<string>;
    currency: TransactionArgument;
}
export interface GetRegistrationOptions {
    package?: string;
    arguments: GetRegistrationArguments | [
        self: RawTransactionArgument<string>,
        currency: TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
export function getRegistration(options: GetRegistrationOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "currency"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'get_registration',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface RegistrationPoolIdArguments {
    r: TransactionArgument;
}
export interface RegistrationPoolIdOptions {
    package?: string;
    arguments: RegistrationPoolIdArguments | [
        r: TransactionArgument
    ];
}
export function registrationPoolId(options: RegistrationPoolIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["r"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'registration_pool_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface RegistrationLastClaimIndexArguments {
    r: TransactionArgument;
}
export interface RegistrationLastClaimIndexOptions {
    package?: string;
    arguments: RegistrationLastClaimIndexArguments | [
        r: TransactionArgument
    ];
}
export function registrationLastClaimIndex(options: RegistrationLastClaimIndexOptions) {
    const packageAddress = options.package ?? '@local-pkg/royalty_pool';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["r"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'stake',
        function: 'registration_last_claim_index',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}