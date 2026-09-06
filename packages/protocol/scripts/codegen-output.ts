// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/** The complete, closed-world directory set emitted by the current codegen config. */
export const GENERATED_CONTRACT_DIRECTORIES = new Set([
  "miso", "composition_credits", "recording_advisory", "recording_credits",
  "recording_language", "recording_master_reference", "recording_preview",
  "release_cover_art", "release_credits", "release_description", "release_dsp_link",
  "release_genre", "release_kind", "royalty_pool",
  "routed_stake", "miso_party", "party_cta", "party_genre", "party_media",
  "party_music", "party_platform_link", "party_pro_link", "party_profile",
  "party_roles", "party_social", "party_tags", "utils",
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
