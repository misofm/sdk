/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * The pressing's certificate on a record.
 * 
 * One struct holds everything the sale fixed about a copy: where it sits in the
 * run, and what was paid for it. These were two dynamic fields — a certificate and
 * a receipt — and separating them bought nothing: both are written once, in the
 * same transaction, by the same call, and neither is meaningful without the other.
 * 
 * A serial is only meaningful inside the sequence that issued it — a different
 * production package counts from 1 again — so the number never travels alone. It
 * does not need to carry its pressing's id to say which sequence it means: a
 * release has exactly one pressing, at a derived address, so
 * `pressing::derive_id(  record.release_id())` recomputes it from the record
 * itself. Storing it would be storing a value that is pure arithmetic on values
 * already present.
 */

import { MoveTuple, MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@local-pkg/miso_pressing::certificate';
export const CertificateKey = new MoveTuple({ name: `${$moduleName}::CertificateKey`, fields: [bcs.bool()] });
export const Certificate = new MoveStruct({ name: `${$moduleName}::Certificate`, fields: {
        /** Position in the pressing's run (1-based). */
        number: bcs.u64(),
        /** The currency type the buyer paid in. */
        purchase_currency: type_name.TypeName,
        /** The exact amount paid. Under a floor price this includes any tip above it. */
        purchase_price: bcs.u64()
    } });
export interface OfArguments {
    record: RawTransactionArgument<string>;
}
export interface OfOptions {
    package?: string;
    arguments: OfArguments | [
        record: RawTransactionArgument<string>
    ];
}
/**
 * The certificate on `record`, or `none` for a record minted by some other
 * package. The only way to read the field, since only this module can construct
 * its key.
 */
export function _of(options: OfOptions) {
    const packageAddress = options.package ?? '@local-pkg/miso_pressing';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["record"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'certificate',
        function: 'of',
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