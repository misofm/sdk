/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * The on-chain pointer to a release's snapshot bundle: which Walrus quilt is this
 * release's bundle.
 * 
 * A snapshot bundle is curated bonus material a buyer gets access to — one Walrus
 * quilt, assembled after the fact. The quilt is self-describing: its plaintext
 * `manifest.json` patch carries all the metadata, its media patches are
 * chunk-encrypted under one AES envelope key, and that key travels Seal-wrapped
 * inside the quilt as its `key.seal` patch. This package therefore stores none of
 * that — no ciphertext, no metadata, no access policy (unlocking by holding a
 * Record is `miso_record_acl`'s concern, in miso-record-extensions). The stored
 * value is the quilt's `WalrusData` blob reference, and nothing else.
 * 
 * The slot is write-once: `set_snapshot_bundle` aborts with `EBundleAlreadySet` if
 * a bundle is already set, and there is NO unset, NO remove, and NO replace
 * function. That absence is a product guarantee: the bundle a buyer's Record
 * points at can never be swapped out from under them. More content later means a
 * new Release.
 */

import { MoveTuple, MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as walrus_data from './deps/ori/walrus_data.js';
const $moduleName = '@local-pkg/release_snapshot_bundle::release_snapshot_bundle';
export const ExtensionKey = new MoveTuple({ name: `${$moduleName}::ExtensionKey`, fields: [bcs.bool()] });
export const SnapshotBundleSetEvent = new MoveStruct({ name: `${$moduleName}::SnapshotBundleSetEvent`, fields: {
        release_id: bcs.Address,
        bundle: walrus_data.WalrusData
    } });
export interface SetSnapshotBundleArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    bundle: TransactionArgument;
}
export interface SetSnapshotBundleOptions {
    package?: string;
    arguments: SetSnapshotBundleArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        bundle: TransactionArgument
    ];
}
/**
 * Sets the release's snapshot bundle — once. Aborts with `EBundleAlreadySet` if a
 * bundle is already set; there is no way to unset or replace it.
 *
 * The reference must be a plaintext standalone blob. A quilt patch is a slice of
 * some other quilt, not the bundle's own quilt blob. And the outer quilt blob is
 * plaintext by design: its `manifest.json` patch must be readable, encryption is
 * per-patch inside the quilt, and the Seal-wrapped envelope key travels as the
 * quilt's `key.seal` patch — so an encrypted outer reference is structurally
 * wrong. With no replace function either mistake would be permanent, which is why
 * both checks live on-chain rather than in the client.
 */
export function setSnapshotBundle(options: SetSnapshotBundleOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_snapshot_bundle';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "bundle"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_snapshot_bundle',
        function: 'set_snapshot_bundle',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface HasSnapshotBundleArguments {
    self: RawTransactionArgument<string>;
}
export interface HasSnapshotBundleOptions {
    package?: string;
    arguments: HasSnapshotBundleArguments | [
        self: RawTransactionArgument<string>
    ];
}
/** Returns whether a snapshot bundle is set on this release. */
export function hasSnapshotBundle(options: HasSnapshotBundleOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_snapshot_bundle';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_snapshot_bundle',
        function: 'has_snapshot_bundle',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface SnapshotBundleArguments {
    self: RawTransactionArgument<string>;
}
export interface SnapshotBundleOptions {
    package?: string;
    arguments: SnapshotBundleArguments | [
        self: RawTransactionArgument<string>
    ];
}
/**
 * The release's snapshot bundle reference. Aborts with `ENoSnapshotBundle` if none
 * is set.
 */
export function snapshotBundle(options: SnapshotBundleOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_snapshot_bundle';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_snapshot_bundle',
        function: 'snapshot_bundle',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}