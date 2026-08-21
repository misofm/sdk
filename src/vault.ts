// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Capability custody and vault-plugin transaction builders.
 *
 * A direct admin cap remains supported for existing works. New work should give
 * the owner a `VaultAdminCap<AdminCap>` and keep the raw admin cap inside the
 * shared Vault. Every authorized call borrows and returns the raw cap inside
 * one helper; borrowed capabilities are never exposed to application code.
 */

import type { BcsType } from "@mysten/sui/bcs";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import type {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import * as vault from "./contracts/vault/vault.ts";
import * as compositionRoyaltyPool from "./contracts/composition_royalty_pool/composition_royalty_pool.ts";
import * as recordingRoyaltyPool from "./contracts/recording_royalty_pool/recording_royalty_pool.ts";
import * as compositionRoutedStake from "./contracts/composition_routed_stake/composition_routed_stake.ts";
import * as releaseRevenueDistributor from "./contracts/release_revenue_distributor/release_revenue_distributor.ts";
import * as routedStake from "./contracts/routed_stake/routed_stake.ts";

/** A legacy work whose raw protocol admin cap is still address-owned. */
/** An object id resolved lazily when a transaction thunk is applied. */
export type ObjectInput = string | TransactionObjectArgument;

function object(tx: Transaction, value: ObjectInput): TransactionObjectArgument {
  return typeof value === "string" ? tx.object(value) : value;
}

export interface DirectAdminCapAuthority {
  readonly kind: "direct";
  readonly adminCap: ObjectInput;
}

/** A work whose protocol admin cap is custodied by a shared Vault. */
export interface VaultAdminCapAuthority {
  readonly kind: "vault";
  readonly vault: ObjectInput;
  readonly vaultAdminCap: ObjectInput;
  /** Fully-qualified protocol cap type, e.g. `0x…::release::ReleaseAdminCap`. */
  readonly capType: string;
  readonly vaultPackageId: string;
}

/** Explicit compatibility boundary for protocol mutations. */
export type AdminCapAuthority =
  | DirectAdminCapAuthority
  | VaultAdminCapAuthority;

export function directAdminCap(
  adminCap: ObjectInput,
): DirectAdminCapAuthority {
  return { kind: "direct", adminCap };
}

function requiredVaultResult<T>(
  result: { readonly [index: number]: T | undefined },
  index: number,
  command: string,
): T {
  const value = result[index];
  if (value === undefined) throw new Error(`${command} did not return result ${index}`);
  return value;
}

export function vaultAdminCap(
  authority: Omit<VaultAdminCapAuthority, "kind">,
): VaultAdminCapAuthority {
  return { kind: "vault", ...authority };
}

/**
 * Lend an authority's raw protocol cap to `use` for the scope of this PTB.
 *
 * The vault branch deliberately encloses `use` between `borrow_as_admin` and
 * `put_back`; callers cannot accidentally leave a non-drop `Borrow` receipt in
 * the transaction. The direct branch preserves compatibility with pre-vault
 * work without silently treating it as protected custody.
 */
/**
 * A Move call whose argument list contains exactly one temporarily lent cap.
 * No callback receives that cap, so it cannot escape past `put_back`.
 */
export interface AdminCapMoveCall {
  readonly target: string;
  readonly typeArguments?: string[];
  readonly arguments: TransactionArgument[];
  readonly adminCapIndex: number;
}

/**
 * Invoke one cap-authorized Move call without exposing a borrowed cap to JS.
 * The returned PTB result belongs to `call.target`, never to the Vault borrow.
 */
export function invokeWithAdminCap(
  tx: Transaction,
  authority: AdminCapAuthority,
  call: AdminCapMoveCall,
): TransactionObjectArgument {
  if (call.adminCapIndex < 0 || call.adminCapIndex > call.arguments.length) {
    throw new Error("admin cap argument index is out of range");
  }

  const invoke = (adminCap: TransactionArgument) => tx.moveCall({
    target: call.target,
    typeArguments: call.typeArguments,
    arguments: [
      ...call.arguments.slice(0, call.adminCapIndex),
      adminCap,
      ...call.arguments.slice(call.adminCapIndex),
    ],
  });
  if (authority.kind === "direct") return invoke(object(tx, authority.adminCap));

  const borrowed = tx.add(
    vault.borrowAsAdmin({
      package: authority.vaultPackageId,
      typeArguments: [authority.capType],
      arguments: [object(tx, authority.vault), object(tx, authority.vaultAdminCap)],
    }),
  );
  const adminCap = borrowed[0];
  const receipt = borrowed[1];
  if (adminCap === undefined || receipt === undefined) {
    throw new Error("vault::borrow_as_admin returned an incomplete result");
  }
  const result = invoke(adminCap);
  tx.add(
    vault.putBack({
      package: authority.vaultPackageId,
      typeArguments: [authority.capType],
      arguments: [authority.vault, adminCap, receipt],
    }),
  );
  return result;
}

export interface CustodyNewAdminCapParams {
  /** The freshly-created raw protocol cap, consumed into the Vault. */
  readonly adminCap: TransactionObjectArgument;
  readonly capType: string;
  readonly vaultPackageId: string;
  /** Recipient of the only owner-held authority: VaultAdminCap. */
  readonly owner: string | TransactionArgument;
  /** Optional installation/configuration while the new Vault is still owned. */
  readonly configure?: (
    vaultObject: TransactionArgument,
    vaultAdminCapObject: TransactionArgument,
  ) => void;
}

/** Where a newly-created raw protocol cap ends up after its work is published. */
export type AdminCapCustody =
  | { readonly kind: "direct"; readonly owner: string | TransactionArgument }
  | {
      readonly kind: "vault";
      readonly owner: string | TransactionArgument;
      readonly capType: string;
      readonly vaultPackageId: string;
      readonly configure?: CustodyNewAdminCapParams["configure"];
    };

/** Explicitly transfer a new cap or custody it before the PTB finishes. */
export function disposeNewAdminCap(
  tx: Transaction,
  adminCap: TransactionObjectArgument,
  custody: AdminCapCustody,
): void {
  if (custody.kind === "direct") {
    tx.transferObjects([adminCap], custody.owner);
    return;
  }
  custodyNewAdminCap(tx, {
    adminCap,
    capType: custody.capType,
    vaultPackageId: custody.vaultPackageId,
    owner: custody.owner,
    configure: custody.configure,
  });
}

/** Destroy a vault only while deliberately disposing of its returned raw cap. */
export function destroyVault(
  tx: Transaction,
  params: {
    readonly vault: ObjectInput;
    readonly vaultAdminCap: ObjectInput;
    readonly capType: string;
    readonly vaultPackageId: string;
    readonly disposition: AdminCapCustody;
  },
): void {
  const cap = tx.add(vault.destroy({
    package: params.vaultPackageId,
    typeArguments: [params.capType],
    arguments: [object(tx, params.vault), object(tx, params.vaultAdminCap)],
  }));
  disposeNewAdminCap(tx, cap, params.disposition);
}

/**
 * Custody a freshly-created raw admin cap, optionally install plugins, share the
 * Vault, then transfer only the VaultAdminCap to its owner.
 */
export function custodyNewAdminCap(
  tx: Transaction,
  params: CustodyNewAdminCapParams,
): void {
  const created = tx.add(
    vault._new({
      package: params.vaultPackageId,
      typeArguments: [params.capType],
      arguments: [params.adminCap],
    }),
  );
  const vaultObject = requiredVaultResult(created, 0, "vault::_new");
  const vaultAdminCap = requiredVaultResult(created, 1, "vault::_new");
  params.configure?.(vaultObject, vaultAdminCap);
  tx.add(
    vault.share({
      package: params.vaultPackageId,
      typeArguments: [params.capType],
      arguments: [vaultObject],
    }),
  );
  tx.transferObjects([vaultAdminCap], params.owner);
}

export interface CompositionRoyaltyPoolPluginParams {
  readonly vault: TransactionObjectArgument;
  readonly vaultAdminCap: TransactionObjectArgument;
  readonly compositionShareType: string;
  readonly pluginPackageId: string;
}

/** Install the composition royalty-pool plugin; its witness stays internal. */
export function installCompositionRoyaltyPoolPlugin(
  tx: Transaction,
  params: CompositionRoyaltyPoolPluginParams,
): void {
  tx.add(
    compositionRoyaltyPool.install({
      package: params.pluginPackageId,
      typeArguments: [params.compositionShareType],
      arguments: [params.vault, params.vaultAdminCap],
    }),
  );
}

export function uninstallCompositionRoyaltyPoolPlugin(
  tx: Transaction,
  params: CompositionRoyaltyPoolPluginParams,
): void {
  tx.add(compositionRoyaltyPool.uninstall({ package: params.pluginPackageId, typeArguments: [params.compositionShareType], arguments: [params.vault, params.vaultAdminCap] }));
}

export interface InitializeCompositionRoyaltyPoolParams
  extends CompositionRoyaltyPoolPluginParams {
  readonly composition: TransactionObjectArgument;
  readonly currencyType: string;
}

export function initializeCompositionRoyaltyPool(
  tx: Transaction,
  params: InitializeCompositionRoyaltyPoolParams,
): void {
  tx.add(
    compositionRoyaltyPool.initializePool({
      package: params.pluginPackageId,
      typeArguments: [params.compositionShareType, params.currencyType],
      arguments: [params.vault, params.composition, params.vaultAdminCap],
    }),
  );
}

export interface CompositionRoyaltyPoolCrankParams {
  readonly vault: TransactionObjectArgument;
  readonly composition: TransactionObjectArgument;
  readonly pool: TransactionObjectArgument;
  readonly compositionShareType: string;
  readonly currencyType: string;
  readonly pluginPackageId: string;
}

/** JSON-safe input for an on-chain u64. Numbers are rejected to prevent rounding. */
export type U64Input = bigint | string | number;

/** Validate an SDK scalar before serializing it as a Move u64. */
export function asU64(name: string, value: U64Input): bigint {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`${name}: number must be a non-negative safe integer; use bigint or decimal string`);
  }
  if (typeof value === "string" && !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${name}: expected an unsigned decimal u64`);
  }
  const parsed = typeof value === "bigint" ? value : BigInt(value);
  if (parsed < 0n || parsed > 18_446_744_073_709_551_615n) {
    throw new Error(`${name}: value is outside u64`);
  }
  return parsed;
}

/** Permissionless crank: redeem address funds into the canonical pool. */
export function redeemCompositionRoyaltyPool(
  tx: Transaction,
  params: CompositionRoyaltyPoolCrankParams & { readonly value: U64Input },
): void {
  tx.add(
    compositionRoyaltyPool.redeemAndDeposit({
      package: params.pluginPackageId,
      typeArguments: [params.compositionShareType, params.currencyType],
      arguments: [params.vault, params.composition, params.pool, asU64("value", params.value)],
    }),
  );
}

/** Permissionless crank: receive selected Composition-owned coins into the pool. */
export function receiveCompositionRoyaltyPool(
  tx: Transaction,
  params: CompositionRoyaltyPoolCrankParams & { readonly coins: readonly ReceivingObjectRef[] },
): void {
  tx.add(
    compositionRoyaltyPool.receiveAndDeposit({
      package: params.pluginPackageId,
      typeArguments: [params.compositionShareType, params.currencyType],
      arguments: [
        params.vault,
        params.composition,
        params.pool,
        receivingCoins(tx, params.currencyType, params.coins),
      ],
    }),
  );
}

export interface RecordingRoyaltyPoolPluginParams {
  readonly vault: TransactionObjectArgument;
  readonly vaultAdminCap: TransactionObjectArgument;
  readonly recordingShareType: string;
  readonly compositionShareType: string;
  readonly pluginPackageId: string;
}

export function installRecordingRoyaltyPoolPlugin(
  tx: Transaction,
  params: RecordingRoyaltyPoolPluginParams,
): void {
  tx.add(
    recordingRoyaltyPool.install({
      package: params.pluginPackageId,
      typeArguments: [params.recordingShareType],
      arguments: [params.vault, params.vaultAdminCap],
    }),
  );
}

export function uninstallRecordingRoyaltyPoolPlugin(
  tx: Transaction,
  params: RecordingRoyaltyPoolPluginParams,
): void {
  tx.add(recordingRoyaltyPool.uninstall({ package: params.pluginPackageId, typeArguments: [params.recordingShareType], arguments: [params.vault, params.vaultAdminCap] }));
}

export interface InitializeRecordingRoyaltyPoolParams
  extends RecordingRoyaltyPoolPluginParams {
  readonly recording: TransactionObjectArgument;
  readonly currencyType: string;
}

export function initializeRecordingRoyaltyPool(
  tx: Transaction,
  params: InitializeRecordingRoyaltyPoolParams,
): void {
  tx.add(
    recordingRoyaltyPool.initializePool({
      package: params.pluginPackageId,
      typeArguments: [
        params.recordingShareType,
        params.compositionShareType,
        params.currencyType,
      ],
      arguments: [params.vault, params.recording, params.vaultAdminCap],
    }),
  );
}

export interface RecordingRoyaltyPoolCrankParams {
  readonly vault: TransactionObjectArgument;
  readonly recording: TransactionObjectArgument;
  readonly pool: TransactionObjectArgument;
  readonly recordingShareType: string;
  readonly compositionShareType: string;
  readonly currencyType: string;
  readonly pluginPackageId: string;
}

export function redeemRecordingRoyaltyPool(
  tx: Transaction,
  params: RecordingRoyaltyPoolCrankParams & { readonly value: U64Input },
): void {
  tx.add(
    recordingRoyaltyPool.redeemAndDeposit({
      package: params.pluginPackageId,
      typeArguments: [
        params.recordingShareType,
        params.compositionShareType,
        params.currencyType,
      ],
      arguments: [params.vault, params.recording, params.pool, asU64("value", params.value)],
    }),
  );
}

/** Permissionless crank: receive selected Recording-owned coins into the pool. */
export function receiveRecordingRoyaltyPool(
  tx: Transaction,
  params: RecordingRoyaltyPoolCrankParams & { readonly coins: readonly ReceivingObjectRef[] },
): void {
  tx.add(
    recordingRoyaltyPool.receiveAndDeposit({
      package: params.pluginPackageId,
      typeArguments: [
        params.recordingShareType,
        params.compositionShareType,
        params.currencyType,
      ],
      arguments: [
        params.vault,
        params.recording,
        params.pool,
        receivingCoins(tx, params.currencyType, params.coins),
      ],
    }),
  );
}

export interface ReleaseRevenueDistributorPluginParams {
  readonly vault: TransactionObjectArgument;
  readonly vaultAdminCap: TransactionObjectArgument;
  readonly pluginPackageId: string;
}

export function installReleaseRevenueDistributorPlugin(
  tx: Transaction,
  params: ReleaseRevenueDistributorPluginParams,
): void {
  tx.add(
    releaseRevenueDistributor.install({
      package: params.pluginPackageId,
      arguments: [params.vault, params.vaultAdminCap],
    }),
  );
}

export function uninstallReleaseRevenueDistributorPlugin(
  tx: Transaction,
  params: ReleaseRevenueDistributorPluginParams,
): void {
  tx.add(releaseRevenueDistributor.uninstall({ package: params.pluginPackageId, arguments: [params.vault, params.vaultAdminCap] }));
}

/** Permissionless crank: redeem release-held money and route it by track BPS. */
export function redeemAndDistributeReleaseRevenue(
  tx: Transaction,
  params: Omit<ReleaseRevenueDistributorPluginParams, "vaultAdminCap"> & {
    readonly release: TransactionObjectArgument;
    readonly currencyType: string;
    readonly value: U64Input;
  },
): void {
  tx.add(
    releaseRevenueDistributor.redeemAndDistribute({
      package: params.pluginPackageId,
      typeArguments: [params.currencyType],
      arguments: [params.vault, params.release, asU64("value", params.value)],
    }),
  );
}

/** Permissionless crank: receive release-owned coins and route them by track BPS. */
export function receiveAndDistributeReleaseRevenue(
  tx: Transaction,
  params: Omit<ReleaseRevenueDistributorPluginParams, "vaultAdminCap"> & {
    readonly release: TransactionObjectArgument;
    readonly currencyType: string;
    readonly coins: readonly ReceivingObjectRef[];
  },
): void {
  tx.add(
    releaseRevenueDistributor.receiveAndDistribute({
      package: params.pluginPackageId,
      typeArguments: [params.currencyType],
      arguments: [
        params.vault,
        params.release,
        receivingCoins(tx, params.currencyType, params.coins),
      ],
    }),
  );
}

export interface CompositionRoutedStakePluginParams {
  readonly vault: TransactionObjectArgument;
  readonly vaultAdminCap: TransactionObjectArgument;
  readonly compositionShareType: string;
  readonly pluginPackageId: string;
}

export function installCompositionRoutedStakePlugin(
  tx: Transaction,
  params: CompositionRoutedStakePluginParams,
): void {
  tx.add(
    compositionRoutedStake.install({
      package: params.pluginPackageId,
      typeArguments: [params.compositionShareType],
      arguments: [params.vault, params.vaultAdminCap],
    }),
  );
}

export function uninstallCompositionRoutedStakePlugin(
  tx: Transaction,
  params: CompositionRoutedStakePluginParams,
): void {
  tx.add(compositionRoutedStake.uninstall({ package: params.pluginPackageId, typeArguments: [params.compositionShareType], arguments: [params.vault, params.vaultAdminCap] }));
}

export interface CreateCompositionRoutedStakeParams
  extends CompositionRoutedStakePluginParams {
  readonly recording: TransactionObjectArgument;
  readonly composition: TransactionObjectArgument;
  readonly recordingShareType: string;
  readonly value: U64Input;
}

export function createCompositionRoutedStake(
  tx: Transaction,
  params: CreateCompositionRoutedStakeParams,
): void {
  tx.add(
    compositionRoutedStake.createStake({
      package: params.pluginPackageId,
      typeArguments: [params.recordingShareType, params.compositionShareType],
      arguments: [
        params.vault,
        params.composition,
        params.recording,
        params.vaultAdminCap,
        asU64("value", params.value),
      ],
    }),
  );
}

export interface ManageCompositionRoutedStakeParams
  extends CompositionRoutedStakePluginParams {
  readonly composition: TransactionObjectArgument;
  readonly recording: TransactionObjectArgument;
  readonly routedStake: TransactionObjectArgument;
  readonly royaltyPool: TransactionObjectArgument;
  readonly recordingShareType: string;
  readonly currencyType: string;
}

/** Register the routed stake with the matching Recording royalty pool. */
export function registerCompositionRoutedStake(
  tx: Transaction,
  params: ManageCompositionRoutedStakeParams,
): void {
  tx.add(
    compositionRoutedStake.register({
      package: params.pluginPackageId,
      typeArguments: [
        params.recordingShareType,
        params.compositionShareType,
        params.currencyType,
      ],
      arguments: [
        params.vault,
        params.composition,
        params.recording,
        params.routedStake,
        params.royaltyPool,
        params.vaultAdminCap,
      ],
    }),
  );
}

/** Unregister a routed stake after pending rewards have been swept. */
export function unregisterCompositionRoutedStake(
  tx: Transaction,
  params: Omit<ManageCompositionRoutedStakeParams, "recording">,
): void {
  tx.add(
    compositionRoutedStake.unregister({
      package: params.pluginPackageId,
      typeArguments: [
        params.recordingShareType,
        params.compositionShareType,
        params.currencyType,
      ],
      arguments: [
        params.vault,
        params.composition,
        params.routedStake,
        params.royaltyPool,
        params.vaultAdminCap,
      ],
    }),
  );
}

/** Return routed principal to the Composition address, never to the caller. */
export function unstakeCompositionRoutedStake(
  tx: Transaction,
  params: Omit<ManageCompositionRoutedStakeParams, "recording" | "royaltyPool" | "currencyType">,
): void {
  tx.add(
    compositionRoutedStake.unstake({
      package: params.pluginPackageId,
      typeArguments: [params.recordingShareType, params.compositionShareType],
      arguments: [
        params.vault,
        params.composition,
        params.routedStake,
        params.vaultAdminCap,
      ],
    }),
  );
}

/** Refill an empty routed stake from Recording shares held by the Composition. */
export function restakeCompositionRoutedStake(
  tx: Transaction,
  params: Omit<ManageCompositionRoutedStakeParams, "recording" | "royaltyPool" | "currencyType"> & {
    readonly value: U64Input;
  },
): void {
  tx.add(
    compositionRoutedStake.restake({
      package: params.pluginPackageId,
      typeArguments: [params.recordingShareType, params.compositionShareType],
      arguments: [
        params.vault,
        params.composition,
        params.routedStake,
        params.vaultAdminCap,
        asU64("value", params.value),
      ],
    }),
  );
}

/** Permissionlessly sweep a routed stake's accrued rewards into its parent pool. */
export function sweepRoutedStake(
  tx: Transaction,
  params: {
    readonly routedStake: ObjectInput;
    /** The pool where the wrapped stake accrues rewards. */
    readonly stakePool: ObjectInput;
    readonly parentId: string;
    readonly royaltyPool: ObjectInput;
    readonly routedStakePackageId: string;
    readonly stakeShareType: string;
    readonly poolShareType: string;
    readonly currencyType: string;
  },
): void {
  tx.add(routedStake.sweep({
    package: params.routedStakePackageId,
    typeArguments: [params.stakeShareType, params.poolShareType, params.currencyType],
    arguments: [object(tx, params.routedStake), object(tx, params.stakePool), object(tx, params.royaltyPool), params.parentId],
  }));
}

/** Parse a VaultAdminCap whose phantom capability does not affect BCS layout. */
export function parseVaultAdminCap(content: Uint8Array) {
  return vault.VaultAdminCap.parse(content);
}

/** Parse lifecycle events whose phantom type parameters do not affect BCS. */
export function parseVaultCreatedEvent(content: Uint8Array) {
  return vault.VaultCreatedEvent.parse(content);
}

/** Parse the release-distribution summary event into JSON-safe quantities. */
export function parseReleaseRevenueDistributedEvent(content: Uint8Array) {
  const event = releaseRevenueDistributor.ReleaseRevenueDistributedEvent.parse(
    content,
  );
  return {
    releaseId: event.release_id,
    totalInput: event.total_input.toString(),
    totalDistributed: event.total_distributed.toString(),
    remainder: event.remainder.toString(),
  };
}

/** Parse one per-track routing event, retaining its u64 values as strings. */
export function parseReleaseTrackRevenueDistributedEvent(content: Uint8Array) {
  const event = releaseRevenueDistributor.ReleaseTrackRevenueDistributedEvent.parse(content);
  return {
    releaseId: event.release_id,
    trackIndex: event.track_index.toString(),
    recordingId: event.recording_id,
    amount: event.amount.toString(),
  };
}

/** Read and BCS-parse an owner-held VaultAdminCap. */
export async function getVaultAdminCap(
  client: ClientWithCoreApi,
  vaultAdminCapId: string,
  expected: { readonly vaultPackageId: string; readonly capType: string },
) {
  const { object } = await client.core.getObject({
    objectId: vaultAdminCapId,
    include: { content: true },
  });
  if (!object || object instanceof Error || !object.content) return null;
  const expectedType = normalizeStructTag(
    `${expected.vaultPackageId}::vault::VaultAdminCap<${expected.capType}>`,
  );
  if (!object.type || normalizeStructTag(object.type) !== expectedType) {
    throw new Error(
      `getVaultAdminCap: expected ${expectedType}, received ${object.type ?? "unknown"}`,
    );
  }
  return parseVaultAdminCap(object.content);
}

/**
 * Build a `vector<Receiving<Coin<Currency>>>` for receive-and-* plugin calls.
 * The caller supplies only object ids; recipient/ownership checks still happen
 * on chain when `hikida::receive_balance` opens each receiving object.
 */
export interface ReceivingObjectRef {
  readonly objectId: string;
  readonly version: string | number;
  readonly digest: string;
}

/** Resolve owned coins to the exact references required by a Receiving input. */
export async function resolveReceivingCoins(
  client: ClientWithCoreApi,
  coinIds: readonly string[],
): Promise<ReceivingObjectRef[]> {
  const { objects } = await client.core.getObjects({ objectIds: [...coinIds] });
  return objects.map((coin, index) => {
    if (coin instanceof Error || !coin) {
      throw new Error(`resolveReceivingCoins: could not resolve ${coinIds[index]}`);
    }
    return { objectId: coin.objectId, version: coin.version, digest: coin.digest };
  });
}

export function receivingCoins(
  tx: Transaction,
  currencyType: string,
  coins: readonly ReceivingObjectRef[],
): TransactionArgument {
  return tx.makeMoveVec({
    type: `0x2::transfer::Receiving<0x2::coin::Coin<${currencyType}>>`,
    elements: coins.map((coin) => tx.receivingRef(coin)),
  });
}

/** Type-only helper for consumers that supply a generated admin-cap BCS type. */
export type VaultCapBcs<Cap extends BcsType<unknown>> = Cap;
