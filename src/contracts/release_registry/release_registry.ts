/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * The recommended canonical parent namespace for `miso::release::new`.
 * 
 * `miso::release::new` takes `parent: &mut UID` and derives every release's id
 * from `(parent, digest)`: core is deliberately parent-agnostic and implements no
 * coordination policy of its own (see the "Consent scope" section of
 * `miso::release`'s module doc). This package supplies the one recommended parent
 * — a shared, permissionless, undeletable `UID` — and is deliberately the _only_
 * policy it implements: it neither gates who may assemble a release through it nor
 * interprets what a `Track` means.
 * 
 * ### One instance, ever
 * 
 * The module exposes no constructor: the only `ReleaseRegistry` that can ever
 * exist is the canonical one created and shared by package initialization. "The
 * registry" is therefore unambiguous on-chain — the type itself names the
 * namespace, not a config convention. Every `new_release` takes `&mut` on that one
 * shared object, so release creation through it serializes per checkpoint; the
 * ceiling is accepted — releases are rare events. Alternative namespaces are still
 * possible, but they live in other packages: core is parent-agnostic, and any
 * object exposing a `&mut UID` (a release escrow, for instance) can parent its own
 * releases; ids derived under different parents never collide, by construction of
 * `derive_address`.
 * 
 * ### Liveness
 * 
 * The canonical instance is shared at publish, and this module exposes no delete
 * function and no `uid_mut`: its only capability is being a derivation parent.
 * That undeletability is a consent guarantee, not an accident — a `Track`'s
 * `target_release_id` commits to this namespace's liveness (see `miso::release`'s
 * module doc), and a deletable parent would strand every track and offer that ever
 * targeted it. Keeping the surface to exactly one capability is what makes that
 * guarantee durable: there is nothing else here to reason about.
 * 
 * ### Permissionless
 * 
 * No capability gates `new_release`: anyone holding a fully-formed `vector<Track>`
 * may assemble and claim a release through this registry. That is not a gap —
 * consent already lives in the `Track`s themselves, each one minted by its
 * recording's admin via cap-gated `miso::track::new` against this exact digest.
 * Assembly is bookkeeping over consent already given, not a second authorization
 * step.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/release_registry::release_registry';
export const ReleaseRegistry = new MoveStruct({ name: `${$moduleName}::ReleaseRegistry`, fields: {
        id: bcs.Address
    } });
export const ReleaseRegistryCreatedEvent = new MoveStruct({ name: `${$moduleName}::ReleaseRegistryCreatedEvent`, fields: {
        registry_id: bcs.Address,
        created_by: bcs.Address
    } });
export interface NewReleaseArguments {
    self: RawTransactionArgument<string>;
    title: RawTransactionArgument<string>;
    tracks: TransactionArgument;
    nonce: RawTransactionArgument<number | bigint>;
}
export interface NewReleaseOptions {
    package?: string;
    arguments: NewReleaseArguments | [
        self: RawTransactionArgument<string>,
        title: RawTransactionArgument<string>,
        tracks: TransactionArgument,
        nonce: RawTransactionArgument<number | bigint>
    ];
}
/**
 * Assembles a release by delegating to `miso::release::new` with this registry as
 * parent. Returns the `(Release, ReleaseAdminCap)` pair rather than transferring
 * or sharing either: the release is not on-chain-final until `release::publish`
 * consumes it by value — typically later in the same PTB — and where the cap ends
 * up is the caller's decision, not this function's.
 */
export function newRelease(options: NewReleaseOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_registry';
    const argumentsTypes = [
        null,
        '0x1::string::String',
        'vector<null>',
        'u256'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "title", "tracks", "nonce"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_registry',
        function: 'new_release',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface DeriveTargetReleaseIdArguments {
    self: RawTransactionArgument<string>;
    recordingIds: RawTransactionArgument<Array<string>>;
    trackSplitValues: RawTransactionArgument<Array<number | bigint>>;
    nonce: RawTransactionArgument<number | bigint>;
}
export interface DeriveTargetReleaseIdOptions {
    package?: string;
    arguments: DeriveTargetReleaseIdArguments | [
        self: RawTransactionArgument<string>,
        recordingIds: RawTransactionArgument<Array<string>>,
        trackSplitValues: RawTransactionArgument<Array<number | bigint>>,
        nonce: RawTransactionArgument<number | bigint>
    ];
}
/**
 * Derives the release id `new_release` would produce for the given inputs under
 * this registry, without creating anything. Delegates to
 * `miso::release::derive_target_release_id` with this registry's own id as parent.
 */
export function deriveTargetReleaseId(options: DeriveTargetReleaseIdOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_registry';
    const argumentsTypes = [
        null,
        'vector<0x2::object::ID>',
        'vector<u64>',
        'u256'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "recordingIds", "trackSplitValues", "nonce"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_registry',
        function: 'derive_target_release_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
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
}
/**
 * Returns the registry's object id — the derivation parent that
 * `derive_target_release_id` and `new_release` both commit to.
 */
export function id(options: IdOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_registry';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_registry',
        function: 'id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}