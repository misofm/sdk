// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "bun:test";
import { Transaction } from "@mysten/sui/transactions";
import { getMisoPlatformDeployment } from "../src/deployments.ts";
import {
  deriveCompositionAdminCapId,
  deriveRecordingAdminCapId,
  deriveReleaseAdminCapId,
} from "@misonetwork/sdk";
import {
  assertAtomicPublicationBounds,
  inspectAtomicPublication,
  parseAtomicPublicationResult,
  publishAtomicCatalog,
  type AtomicPublicationParams,
} from "../src/publication.ts";
import { derivePressingAdminCapId, derivePressingId } from "../src/pressing.ts";
import * as contracts from "../src/contracts.ts";
import type { PlatformExecResult } from "../src/execute.ts";

const A = "0x" + "ab".repeat(32);
const SHARE_1 = "0x" + "11".repeat(32) + "::share::Share";
const SHARE_2 = "0x" + "22".repeat(32) + "::share::Share";

function params(): AtomicPublicationParams {
  return {
    deployment: getMisoPlatformDeployment("testnet"),
    parties: [{
      ref: "artist",
      create: "individual",
      name: "Artist",
      custody: { kind: "vault", owner: A },
    }],
    compositions: [{
      ref: "c1",
      shareType: SHARE_1,
      shareCurrencyId: A,
      shareTreasuryCapId: A,
      title: "Composition",
      royaltyRateBps: 1_000,
      shareRecipients: [{ address: A, value: 10_000_000_000_000n }],
      custody: { kind: "vault", owner: A },
      credits: [{ party: "artist", displayName: "Artist", roles: [{ type: "Composer" }] }],
      royaltyPool: { currencyType: "0x2::sui::SUI" },
      routedStake: true,
    }],
    recordings: [{
      ref: "r1",
      parentCompositionIndex: 0,
      shareType: SHARE_2,
      shareCurrencyId: A,
      shareTreasuryCapId: A,
      compositionShareType: SHARE_1,
      shareRecipients: [{ address: A, value: 9_000_000_000_000n }],
      custody: { kind: "vault", owner: A },
      credits: [{ party: "artist", displayName: "Artist", roles: [{ type: "Producer" }], primaryArtist: true }],
      royaltyPool: { currencyType: "0x2::sui::SUI" },
      advisory: "Explicit",
      languages: { kind: "languages", codes: ["en"] },
      masterReferenceBlobId: 1n,
      previewBlobId: 2n,
    }],
    release: {
      title: "Release",
      nonce: "1",
      tracks: [{ recordingIndex: 0, splitBps: 10_000 }],
      custody: { kind: "vault", owner: A },
      credits: [{ party: "artist", displayName: "Artist", role: "Primary" }],
      kind: "EP",
      description: "Description",
      genres: { primaryGenreId: A },
      cover: { stillBlobId: 3n },
      revenueDistribution: true,
    },
    pressing: {
      listings: [{ currencyType: "0x2::sui::SUI", price: { kind: "floor", amount: 1_000_000n } }],
      custody: { kind: "vault", owner: A },
    },
  };
}

function calls(tx: Transaction): string[] {
  const data = tx.getData() as {
    commands: { $kind: string; MoveCall?: { module: string; function: string } }[];
  };
  return data.commands
    .filter((command) => command.$kind === "MoveCall" && command.MoveCall)
    .map((command) => `${command.MoveCall!.module}::${command.MoveCall!.function}`);
}

test("atomic publication includes the full graph, extensions, plugins, and custody", () => {
  const tx = new Transaction();
  const input = params();
  publishAtomicCatalog(input)(tx);
  const seq = calls(tx);
  const count = (value: string) => seq.filter((item) => item === value).length;

  expect(count("party::new")).toBe(1);
  expect(count("composition::new")).toBe(1);
  expect(count("recording::new")).toBe(1);
  expect(count("release::new")).toBe(1);
  expect(count("pressing::new")).toBe(1);
  expect(count("composition_credits::add_credit")).toBe(1);
  expect(count("recording_credits::add_credit")).toBe(1);
  expect(count("recording_credits::add_primary_artist")).toBe(1);
  expect(count("recording_advisory::set_rating")).toBe(1);
  expect(count("recording_language::set_languages")).toBe(1);
  expect(count("recording_master_reference::set_master_reference")).toBe(1);
  expect(count("recording_preview::set_preview")).toBe(1);
  expect(count("release_credits::add_credit")).toBe(1);
  expect(count("release_kind::set_kind")).toBe(1);
  expect(count("release_description::set_description")).toBe(1);
  expect(count("release_genre::set_primary_genre")).toBe(1);
  expect(count("release_cover_art::set_cover")).toBe(1);
  expect(count("composition_royalty_pool::install")).toBe(1);
  expect(count("composition_royalty_pool::initialize_pool")).toBe(1);
  expect(count("recording_royalty_pool::install")).toBe(1);
  expect(count("recording_royalty_pool::initialize_pool")).toBe(1);
  expect(count("composition_routed_stake::install")).toBe(1);
  expect(count("release_revenue_distributor::install")).toBe(1);
  expect(count("party_wallet::install")).toBe(1);
  expect(count("vault::new")).toBe(5);
  expect(count("vault::share")).toBe(5);
  const recordingCapType = `${input.deployment.protocol.miso}::recording::RecordingAdminCap<${SHARE_2}>`;
  const recordingVault = tx.getData().commands.find((command) =>
    command.$kind === "MoveCall" &&
    command.MoveCall.module === "vault" &&
    command.MoveCall.function === "new" &&
    command.MoveCall.typeArguments.includes(recordingCapType));
  expect(recordingVault).toBeDefined();
  expect(seq.indexOf("release::new")).toBeLessThan(seq.indexOf("release::publish"));
  expect(seq.indexOf("composition_royalty_pool::initialize_pool")).toBeLessThan(seq.indexOf("composition::publish"));
  expect(seq.indexOf("recording_royalty_pool::initialize_pool")).toBeLessThan(seq.indexOf("recording::publish"));
});

test("atomic publication is exactly assembled and checked before execution", () => {
  const inspected = inspectAtomicPublication(params());
  expect(inspected.commands).toBeGreaterThan(40);
  expect(inspected.inputs).toBeGreaterThan(10);
  expect(assertAtomicPublicationBounds(params())).toEqual(inspected);
});

test("Vault-only publication features reject direct custody", () => {
  const input = params();
  const direct: AtomicPublicationParams = {
    ...input,
    compositions: input.compositions.map((node, index) => index === 0
      ? { ...node, custody: { kind: "direct", owner: A } }
      : node),
  };
  expect(() => publishAtomicCatalog(direct)).toThrow(/Vault-only plugins require Vault custody/);
});

test("atomic result parsing derives wrapped admin-cap ids instead of requiring top-level cap effects", () => {
  const input: AtomicPublicationParams = {
    ...params(),
    parties: [{ ref: "artist", id: A }],
  };
  const deployment = input.deployment;
  const compositionId = "0x" + "31".repeat(32);
  const recordingId = "0x" + "32".repeat(32);
  const releaseId = "0x" + "33".repeat(32);
  const compositionPoolId = "0x" + "34".repeat(32);
  const recordingPoolId = "0x" + "35".repeat(32);
  const compositionCapId = deriveCompositionAdminCapId(compositionId, deployment.protocol.miso);
  const recordingCapId = deriveRecordingAdminCapId(recordingId, deployment.protocol.miso);
  const releaseCapId = deriveReleaseAdminCapId(releaseId, deployment.protocol.miso);
  const pressingId = derivePressingId(releaseId, deployment.packages.pressing);
  const pressingCapId = derivePressingAdminCapId(pressingId, deployment.packages.pressing);
  const wrappedCaps = [compositionCapId, recordingCapId, releaseCapId, pressingCapId];
  const vaultIds = wrappedCaps.map((_, index) => `0x${(65 + index).toString(16).repeat(64).slice(0, 64)}`);
  const events = wrappedCaps.map((wrappedCapId, index) => ({
    eventType: `${deployment.packages.vault}::vault::VaultCreatedEvent<0x1::cap::Cap>`,
    bcs: contracts.vault.VaultCreatedEvent.serialize({
      vault_id: vaultIds[index]!,
      vault_admin_cap_id: `0x${(81 + index).toString(16).repeat(64).slice(0, 64)}`,
      wrapped_cap_id: wrappedCapId,
      authorized_plugins_id: `0x${(97 + index).toString(16).repeat(64).slice(0, 64)}`,
    }).toBytes(),
  }));
  const objectTypes: Record<string, string> = {
    [compositionId]: `${deployment.protocol.miso}::composition::Composition<${SHARE_1}>`,
    [recordingId]: `${deployment.protocol.miso}::recording::Recording<${SHARE_2},${SHARE_1}>`,
    [releaseId]: `${deployment.protocol.miso}::release::Release`,
    [compositionPoolId]: `${deployment.packages.royaltyPool}::pool::RoyaltyPool<${SHARE_1},0x2::sui::SUI>`,
    [recordingPoolId]: `${deployment.packages.royaltyPool}::pool::RoyaltyPool<${SHARE_2},0x2::sui::SUI>`,
  };
  const result = {
    digest: "digest",
    gasUsed: 7,
    objectTypes,
    changedObjects: Object.keys(objectTypes).map((objectId) => ({
      objectId,
      idOperation: "Created",
      outputState: "ObjectWrite",
    })),
    balanceChanges: [],
    events,
  } as unknown as PlatformExecResult;

  const parsed = parseAtomicPublicationResult(input, result);
  expect(parsed.compositions.c1).toMatchObject({ id: compositionId, adminCapId: compositionCapId, royaltyPoolId: compositionPoolId });
  expect(parsed.recordings.r1).toMatchObject({ id: recordingId, adminCapId: recordingCapId, royaltyPoolId: recordingPoolId });
  expect(parsed.release).toMatchObject({ id: releaseId, adminCapId: releaseCapId });
  expect(parsed.pressing).toMatchObject({ id: pressingId, adminCapId: pressingCapId });
  expect(parsed.recordings.r1!.authority).toMatchObject({ kind: "vault", vaultId: vaultIds[1] });
});
