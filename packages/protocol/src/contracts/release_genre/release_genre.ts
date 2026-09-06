/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Genre assignment for a Miso release: an album-level primary + secondary genres,
 * plus optional per-track primary overrides.
 *
 * Genre is presentation, not objective recording data, so it is assigned on the
 * release (the consumer object), not the recording. Stored as a single
 * `ReleaseGenre` dynamic field on the release's UID, gated by the
 * `ReleaseAdminCap`.
 *
 * A track's effective primary genre resolves as: its per-track override if set,
 * else the album primary.
 *
 * A genre is either the album primary or a secondary, never both — the two are
 * kept disjoint: setting the primary to a current secondary aborts (remove it from
 * the secondaries first), and adding the current primary as a secondary aborts.
 */

import { MoveTuple, MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.ts';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as per_track from './deps/per_track/per_track.ts';
const $moduleName = '@local-pkg/release_genre::release_genre';
export const ExtensionKey = new MoveTuple({ name: `${$moduleName}::ExtensionKey`, fields: [bcs.bool()] });
export const ReleaseGenre = new MoveStruct({ name: `${$moduleName}::ReleaseGenre`, fields: {
        primary: bcs.Address,
        secondary: bcs.vector(bcs.Address),
        track_primary: per_track.PerTrack(bcs.option(bcs.Address))
    } });
export const PrimaryGenreSetEvent = new MoveStruct({ name: `${$moduleName}::PrimaryGenreSetEvent`, fields: {
        release_id: bcs.Address,
        genre_id: bcs.Address
    } });
export const SecondaryGenreAddedEvent = new MoveStruct({ name: `${$moduleName}::SecondaryGenreAddedEvent`, fields: {
        release_id: bcs.Address,
        genre_id: bcs.Address
    } });
export const SecondaryGenreRemovedEvent = new MoveStruct({ name: `${$moduleName}::SecondaryGenreRemovedEvent`, fields: {
        release_id: bcs.Address,
        genre_id: bcs.Address
    } });
export const TrackPrimaryGenreSetEvent = new MoveStruct({ name: `${$moduleName}::TrackPrimaryGenreSetEvent`, fields: {
        release_id: bcs.Address,
        track_index: bcs.u64(),
        genre_id: bcs.Address
    } });
export const TrackPrimaryGenreUnsetEvent = new MoveStruct({ name: `${$moduleName}::TrackPrimaryGenreUnsetEvent`, fields: {
        release_id: bcs.Address,
        track_index: bcs.u64()
    } });
export interface SetPrimaryGenreArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    genre: RawTransactionArgument<string>;
}
export interface SetPrimaryGenreOptions {
    package?: string;
    arguments: SetPrimaryGenreArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        genre: RawTransactionArgument<string>
    ];
}
/**
 * Sets (or replaces) the album primary genre. Gated by the release admin cap.
 * Aborts if the genre is currently an album secondary — remove it from the
 * secondaries first (primary and secondary are kept disjoint).
 */
export function setPrimaryGenre(options: SetPrimaryGenreOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "genre"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'set_primary_genre',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface AddSecondaryGenreArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    genre: RawTransactionArgument<string>;
}
export interface AddSecondaryGenreOptions {
    package?: string;
    arguments: AddSecondaryGenreArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        genre: RawTransactionArgument<string>
    ];
}
/**
 * Adds an album secondary genre. Requires the album primary first. Rejects a
 * secondary equal to the primary, duplicates, and counts at/above the maximum.
 */
export function addSecondaryGenre(options: AddSecondaryGenreOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "genre"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'add_secondary_genre',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface RemoveSecondaryGenreArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    genre: RawTransactionArgument<string>;
}
export interface RemoveSecondaryGenreOptions {
    package?: string;
    arguments: RemoveSecondaryGenreArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        genre: RawTransactionArgument<string>
    ];
}
/** Removes an album secondary genre. */
export function removeSecondaryGenre(options: RemoveSecondaryGenreOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "genre"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'remove_secondary_genre',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface SetTrackPrimaryGenreArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    trackIndex: RawTransactionArgument<number | bigint>;
    genre: RawTransactionArgument<string>;
}
export interface SetTrackPrimaryGenreOptions {
    package?: string;
    arguments: SetTrackPrimaryGenreArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        trackIndex: RawTransactionArgument<number | bigint>,
        genre: RawTransactionArgument<string>
    ];
}
/**
 * Sets (or replaces) a track's primary-genre override (by tracklist index).
 * Requires the album primary first. Aborts if the index is out of range.
 */
export function setTrackPrimaryGenre(options: SetTrackPrimaryGenreOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null,
        null,
        'u64',
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "trackIndex", "genre"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'set_track_primary_genre',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface UnsetTrackPrimaryGenreArguments {
    self: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
    trackIndex: RawTransactionArgument<number | bigint>;
}
export interface UnsetTrackPrimaryGenreOptions {
    package?: string;
    arguments: UnsetTrackPrimaryGenreArguments | [
        self: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>,
        trackIndex: RawTransactionArgument<number | bigint>
    ];
}
/**
 * Removes a track's primary-genre override — the track falls back to the album
 * primary. Aborts if the index is out of range.
 */
export function unsetTrackPrimaryGenre(options: UnsetTrackPrimaryGenreOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "cap", "trackIndex"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'unset_track_primary_genre',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface HasGenreArguments {
    self: RawTransactionArgument<string>;
}
export interface HasGenreOptions {
    package?: string;
    arguments: HasGenreArguments | [
        self: RawTransactionArgument<string>
    ];
}
/** Returns whether the release has a genre assignment. */
export function hasGenre(options: HasGenreOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'has_genre',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface PrimaryGenreArguments {
    self: RawTransactionArgument<string>;
}
export interface PrimaryGenreOptions {
    package?: string;
    arguments: PrimaryGenreArguments | [
        self: RawTransactionArgument<string>
    ];
}
/** Returns the album primary genre id, if set. */
export function primaryGenre(options: PrimaryGenreOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'primary_genre',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface SecondaryGenresArguments {
    self: RawTransactionArgument<string>;
}
export interface SecondaryGenresOptions {
    package?: string;
    arguments: SecondaryGenresArguments | [
        self: RawTransactionArgument<string>
    ];
}
/** Returns the album secondary genre ids (empty if none). */
export function secondaryGenres(options: SecondaryGenresOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["self"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'secondary_genres',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface TrackPrimaryGenreArguments {
    self: RawTransactionArgument<string>;
    trackIndex: RawTransactionArgument<number | bigint>;
}
export interface TrackPrimaryGenreOptions {
    package?: string;
    arguments: TrackPrimaryGenreArguments | [
        self: RawTransactionArgument<string>,
        trackIndex: RawTransactionArgument<number | bigint>
    ];
}
/**
 * Returns a track's effective primary genre: its override if set, else the album
 * primary. None if no genre is assigned to the release. Aborts if the track index
 * is out of range (when an assignment exists).
 */
export function trackPrimaryGenre(options: TrackPrimaryGenreOptions) {
    const packageAddress = options.package ?? '@local-pkg/release_genre';
    const argumentsTypes = [
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["self", "trackIndex"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'release_genre',
        function: 'track_primary_genre',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}