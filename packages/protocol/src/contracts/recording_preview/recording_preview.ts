/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Recording audio preview: a short, public teaser clip for a recording, stored as
 * a dynamic field on the recording's UID, set/cleared via the recording's
 * cap-gated `uid_mut`.
 *
 * V1 is deliberately minimal: the value is a bare `ori::data::WalrusBlob`
 * reference — no ingestion or attestation ties the preview to the recording's
 * master. What the blob contains (codec, duration, clip offset) is client-side
 * convention, not protocol state. An attested preview standard can ship later as
 * its own extension without touching this one.
 */

import { MoveTuple, MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.ts';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as data from './deps/ori/data.ts';
const $moduleName = '@local-pkg/recording_preview::recording_preview';
export const ExtensionKey = new MoveTuple({ name: `${$moduleName}::ExtensionKey`, fields: [bcs.bool()] });
export const PreviewSetEvent = new MoveStruct({ name: `${$moduleName}::PreviewSetEvent`, fields: {
        recording_id: bcs.Address,
        preview: data.WalrusBlob
    } });
export const PreviewUnsetEvent = new MoveStruct({ name: `${$moduleName}::PreviewUnsetEvent`, fields: {
        recording_id: bcs.Address
    } });
export interface SetPreviewArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    preview: TransactionArgument;
}
export interface SetPreviewOptions {
    package?: string;
    arguments: SetPreviewArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        preview: TransactionArgument
    ];
    typeArguments: [
        string,
        string
    ];
}
/**
 * Sets (or replaces) the recording's preview. The reference must be a standalone
 * Walrus blob.
 */
export function setPreview(options: SetPreviewOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_preview';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "preview"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_preview',
        function: 'set_preview',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface UnsetPreviewArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
}
export interface UnsetPreviewOptions {
    package?: string;
    arguments: UnsetPreviewArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/** Removes the preview, if any. */
export function unsetPreview(options: UnsetPreviewOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_preview';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_preview',
        function: 'unset_preview',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface HasPreviewArguments {
    self: RawTransactionArgument<string>;
}
export interface HasPreviewOptions {
    package?: string;
    arguments: HasPreviewArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/** Returns whether a preview is attached to this recording. */
export function hasPreview(options: HasPreviewOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_preview';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_preview',
        function: 'has_preview',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface PreviewArguments {
    self: RawTransactionArgument<string>;
}
export interface PreviewOptions {
    package?: string;
    arguments: PreviewArguments | [
        self: RawTransactionArgument<string>
    ];
    typeArguments: [
        string,
        string
    ];
}
/** Borrows the preview's Walrus reference. Aborts if none is attached. */
export function preview(options: PreviewOptions) {
    const packageAddress = options.package ?? '@local-pkg/recording_preview';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'recording_preview',
        function: 'preview',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}