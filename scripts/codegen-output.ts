// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * The complete, closed-world directory set emitted by the current codegen config —
 * one entry per `packages[].package` output plus `utils`, which `@mysten/codegen`
 * writes on every run without a corresponding config entry, and `recording_preview`,
 * which is frozen (see `sui-codegen.config.ts`): retained here so it survives
 * pruning even though the runner never regenerates it.
 */
export const GENERATED_CONTRACT_DIRECTORIES = new Set([
  "miso",
  "miso_party",
  "party_cta",
  "party_genre",
  "party_media",
  "party_music",
  "party_platform_link",
  "party_pro_link",
  "party_profile",
  "party_roles",
  "party_social",
  "party_tags",
  "party_wallet",
  "composition_credits",
  "recording_advisory",
  "recording_credits",
  "recording_language",
  "recording_master_reference",
  "recording_streaming_transcode",
  "release_cover_art",
  "release_credits",
  "release_description",
  "release_dsp_link",
  "release_genre",
  "release_kind",
  "royalty_pool",
  "routed_stake",
  "vault",
  "genre",
  "cover_art",
  "composition_royalty_pool",
  "recording_royalty_pool",
  // composition_routed_stake is intentionally not generated yet — see the
  // comment in sui-codegen.config.ts.
  "release_revenue_distributor",
  // composition_royalty_pool_plugin, recording_royalty_pool_plugin, and
  // release_revenue_distributor_plugin are intentionally not generated yet —
  // see the comment in sui-codegen.config.ts.
  "miso_record",
  // miso_record_shop is intentionally not generated yet — see the comment in
  // sui-codegen.config.ts.
  "utils",
  // Frozen — see the `frozen` package entry in sui-codegen.config.ts.
  "recording_preview",
]);

/**
 * Enforce codegen as a closed-world operation. A removed Move package must not
 * leave a stale generated namespace that can be accidentally imported.
 */
export function pruneRemovedPackageDirectories(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !GENERATED_CONTRACT_DIRECTORIES.has(entry.name)) {
      rmSync(join(directory, entry.name), { recursive: true, force: true });
    }
  }
}
