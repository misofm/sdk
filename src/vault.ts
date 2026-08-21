// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Capability custody and vault-plugin transaction builders.
 *
 * A direct admin cap remains supported for existing works. New work should give
 * the owner a `VaultAdminCap<AdminCap>` and keep the raw admin cap inside the
 * shared Vault. `withAdminCap` is the only generic escape hatch: it borrows a
 * cap, runs the supplied PTB commands, and returns the exact cap before the
 * transaction can finish.
 */

import type { BcsType } from "@mysten/sui/bcs";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import type {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import * as vault from "./contracts/vault/vault.ts";
import * as compositionRoyaltyPool from "./contracts/composition_royalty_pool/composition_royalty_pool.ts";
import * as recordingRoyaltyPool from "./contracts/recording_royalty_pool/recording_royalty_pool.ts";
import * as compositionRoutedStake from "./contracts/composition_routed_stake/composition_routed_stake.ts";
import * as releaseRevenueDistributor from "./contracts/release_revenue_distributor/release_revenue_distributor.ts";

/** A legacy work whose raw protocol admin cap is still address-owned. */
export interface DirectAdminCapAuthority {
  readonly kind: "direct";
  readonly adminCap: TransactionObjectArgument;
}

/** A work whose protocol admin cap is custodied by a shared Vault. */
export interface VaultAdminCapAuthority {
  readonly kind: "vault";
  readonly vault: TransactionObjectArgument;
  readonly vaultAdminCap: TransactionObjectArgument;
  /** Fully-qualified protocol cap type, e.g. `0x…::release::ReleaseAdminCap`. */
  readonly capType: string;
  readonly vaultPackageId: string;
}

/** Explicit compatibility boundary for protocol mutations. */
export type AdminCapAuthority =
  | DirectAdminCapAuthority
  | VaultAdminCapAuthority;

export function directAdminCap(
  adminCap: TransactionObjectArgument,
): DirectAdminCapAuthority {
  return { kind: "direct", adminCap };
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
export function withAdminCap(
  tx: Transaction,
  authority: AdminCapAuthority,
  use: (adminCap: TransactionArgument) => void,
): void {
  if (authority.kind === "direct") {
    use(authority.adminCap);
    return;
  }

  const borrowed = tx.add(
    vault.borrowAsAdmin({
      package: authority.vaultPackageId,
      typeArguments: [authority.capType],
      arguments: [authority.vault, authority.vaultAdminCap],
    }),
  );
  use(borrowed[0]!);
  tx.add(
    vault.putBack({
      package: authority.vaultPackageId,
      typeArguments: [authority.capType],
      arguments: [authority.vault, borrowed[0]!, borrowed[1]!],
    }),
  );
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
  params.configure?.(created[0]!, created[1]!);
  tx.add(
    vault.share({
      package: params.vaultPackageId,
      typeArguments: [params.capType],
      arguments: [created[0]!],
    }),
  );
  tx.transferObjects([created[1]!], params.owner);
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

/** Permissionless crank: redeem address funds into the canonical pool. */
export function redeemCompositionRoyaltyPool(
  tx: Transaction,
  params: CompositionRoyaltyPoolCrankParams & { readonly value: bigint | number },
): void {
  tx.add(
    compositionRoyaltyPool.redeemAndDeposit({
      package: params.pluginPackageId,
      typeArguments: [params.compositionShareType, params.currencyType],
      arguments: [params.vault, params.composition, params.pool, params.value],
    }),
  );
}

/** Permissionless crank: receive selected Composition-owned coins into the pool. */
export function receiveCompositionRoyaltyPool(
  tx: Transaction,
  params: CompositionRoyaltyPoolCrankParams & { readonly coinIds: readonly string[] },
): void {
  tx.add(
    compositionRoyaltyPool.receiveAndDeposit({
      package: params.pluginPackageId,
      typeArguments: [params.compositionShareType, params.currencyType],
      arguments: [
        params.vault,
        params.composition,
        params.pool,
        receivingCoins(tx, params.currencyType, params.coinIds),
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
  params: RecordingRoyaltyPoolCrankParams & { readonly value: bigint | number },
): void {
  tx.add(
    recordingRoyaltyPool.redeemAndDeposit({
      package: params.pluginPackageId,
      typeArguments: [
        params.recordingShareType,
        params.compositionShareType,
        params.currencyType,
      ],
      arguments: [params.vault, params.recording, params.pool, params.value],
    }),
  );
}

/** Permissionless crank: receive selected Recording-owned coins into the pool. */
export function receiveRecordingRoyaltyPool(
  tx: Transaction,
  params: RecordingRoyaltyPoolCrankParams & { readonly coinIds: readonly string[] },
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
        receivingCoins(tx, params.currencyType, params.coinIds),
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

/** Permissionless crank: redeem release-held money and route it by track BPS. */
export function redeemAndDistributeReleaseRevenue(
  tx: Transaction,
  params: Omit<ReleaseRevenueDistributorPluginParams, "vaultAdminCap"> & {
    readonly release: TransactionObjectArgument;
    readonly currencyType: string;
    readonly value: bigint | number;
  },
): void {
  tx.add(
    releaseRevenueDistributor.redeemAndDistribute({
      package: params.pluginPackageId,
      typeArguments: [params.currencyType],
      arguments: [params.vault, params.release, params.value],
    }),
  );
}

/** Permissionless crank: receive release-owned coins and route them by track BPS. */
export function receiveAndDistributeReleaseRevenue(
  tx: Transaction,
  params: Omit<ReleaseRevenueDistributorPluginParams, "vaultAdminCap"> & {
    readonly release: TransactionObjectArgument;
    readonly currencyType: string;
    readonly coinIds: readonly string[];
  },
): void {
  tx.add(
    releaseRevenueDistributor.receiveAndDistribute({
      package: params.pluginPackageId,
      typeArguments: [params.currencyType],
      arguments: [
        params.vault,
        params.release,
        receivingCoins(tx, params.currencyType, params.coinIds),
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

export interface CreateCompositionRoutedStakeParams
  extends CompositionRoutedStakePluginParams {
  readonly recording: TransactionObjectArgument;
  readonly composition: TransactionObjectArgument;
  readonly recordingShareType: string;
  readonly value: bigint | number;
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
        params.value,
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
    readonly value: bigint | number;
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
        params.value,
      ],
    }),
  );
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

/** Read and BCS-parse an owner-held VaultAdminCap. */
export async function getVaultAdminCap(
  client: ClientWithCoreApi,
  vaultAdminCapId: string,
) {
  const { object } = await client.core.getObject({
    objectId: vaultAdminCapId,
    include: { content: true },
  });
  if (!object || object instanceof Error || !object.content) return null;
  return parseVaultAdminCap(object.content);
}

/**
 * Build a `vector<Receiving<Coin<Currency>>>` for receive-and-* plugin calls.
 * The caller supplies only object ids; recipient/ownership checks still happen
 * on chain when `hikida::receive_balance` opens each receiving object.
 */
export function receivingCoins(
  tx: Transaction,
  currencyType: string,
  coinIds: readonly string[],
): TransactionArgument {
  return tx.makeMoveVec({
    type: `0x2::transfer::Receiving<0x2::coin::Coin<${currencyType}>>`,
    elements: coinIds.map((coinId) => tx.object(coinId)),
  });
}

/** Type-only helper for consumers that supply a generated admin-cap BCS type. */
export type VaultCapBcs<Cap extends BcsType<unknown>> = Cap;
