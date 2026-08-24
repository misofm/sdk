/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Immutable provenance for a record pressed by `miso_pressing`.
 * 
 * `Certificate` is embedded in `Record<Certificate>`, never attached as a dynamic
 * field. Its private fields and package-only constructor mean an external package
 * cannot construct this certificate or mint the trusted record specialization.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@local-pkg/miso_pressing::certificate';
export const Certificate = new MoveStruct({ name: `${$moduleName}::Certificate`, fields: {
        /** The object whose derived-UID namespace issued this record. */
        parent_id: bcs.Address,
        /** Position in the pressing's run (1-based). */
        number: bcs.u64(),
        /** The transaction sender that purchased the record from its listing. */
        purchased_by: bcs.Address,
        /** The currency type the buyer paid in. */
        purchase_currency: type_name.TypeName,
        /** The exact amount paid. Under a floor price this includes any tip above it. */
        purchase_price: bcs.u64(),
        /** The timestamp stamped from the shared Clock on the Listing purchase path. */
        created_at_ms: bcs.u64()
    } });
export interface ParentIdArguments {
    self: TransactionArgument;
}
export interface ParentIdOptions {
    package?: string;
    arguments: ParentIdArguments | [
        self: TransactionArgument
    ];
}
export function parentId(options: ParentIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'certificate',
        function: 'parent_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface NumberArguments {
    self: TransactionArgument;
}
export interface NumberOptions {
    package?: string;
    arguments: NumberArguments | [
        self: TransactionArgument
    ];
}
export function number(options: NumberOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'certificate',
        function: 'number',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface PurchasedByArguments {
    self: TransactionArgument;
}
export interface PurchasedByOptions {
    package?: string;
    arguments: PurchasedByArguments | [
        self: TransactionArgument
    ];
}
export function purchasedBy(options: PurchasedByOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'certificate',
        function: 'purchased_by',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface PurchaseCurrencyArguments {
    self: TransactionArgument;
}
export interface PurchaseCurrencyOptions {
    package?: string;
    arguments: PurchaseCurrencyArguments | [
        self: TransactionArgument
    ];
}
export function purchaseCurrency(options: PurchaseCurrencyOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'certificate',
        function: 'purchase_currency',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface PurchasePriceArguments {
    self: TransactionArgument;
}
export interface PurchasePriceOptions {
    package?: string;
    arguments: PurchasePriceArguments | [
        self: TransactionArgument
    ];
}
export function purchasePrice(options: PurchasePriceOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'certificate',
        function: 'purchase_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface CreatedAtMsArguments {
    self: TransactionArgument;
}
export interface CreatedAtMsOptions {
    package?: string;
    arguments: CreatedAtMsArguments | [
        self: TransactionArgument
    ];
}
export function createdAtMs(options: CreatedAtMsOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'certificate',
        function: 'created_at_ms',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}