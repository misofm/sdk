// Copyright (c) Miso Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Generate bindings without writing `package_summaries/` into sibling Move
 * source worktrees. `sui move summary` receives each source path but writes its
 * result into a unique temporary directory; @mysten/codegen then reads only
 * that copied summary and writes the tracked bindings under `src/contracts`.
 */

import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { generateFromPackageSummary, type SuiCodegenConfig } from "@mysten/codegen";
import config from "../sui-codegen.config.ts";
import { pruneRemovedPackageDirectories } from "./codegen-output.ts";

const codegenConfig = config as SuiCodegenConfig;
const temporaryRoot = mkdtempSync(join(tmpdir(), "miso-sdk-codegen-"));
const outputDir = resolve(process.cwd(), codegenConfig.output);
// A full SDK copy can live outside the usual sibling-checkout layout. Point this
// at the SDK checkout whose `../protocol*` siblings should supply Move source.
// It defaults to this SDK checkout, which is the normal development layout.
const sourceConfigRoot = resolve(
  process.env.MISO_SDK_CODEGEN_SOURCE_ROOT ?? join(import.meta.dir, ".."),
);
/** Keep generated output clean even when a generator template emits ` * ` lines. */
function normalizeGeneratedWhitespace(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      normalizeGeneratedWhitespace(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      const source = readFileSync(entryPath, "utf8");
      const normalized = source.replace(/[ \t]+(?=\r?$)/gm, "");
      if (normalized !== source) writeFileSync(entryPath, normalized);
    }
  }
}

try {
  pruneRemovedPackageDirectories(outputDir);
  for (const [index, packageConfig] of codegenConfig.packages.entries()) {
    if (!("path" in packageConfig) || !packageConfig.path) {
      throw new Error("Miso SDK codegen supports only source-backed packages.");
    }

    const sourcePath =
      packageConfig.package === "@local-pkg/miso" && process.env.MISO_SDK_CORE_SOURCE_PATH
        ? resolve(process.env.MISO_SDK_CORE_SOURCE_PATH)
        : resolve(sourceConfigRoot, packageConfig.path);
    const summaryPath = join(
      temporaryRoot,
      `${String(index).padStart(2, "0")}-${basename(sourcePath)}`,
    );
    mkdirSync(summaryPath, { recursive: true });
    copyFileSync(join(sourcePath, "Move.toml"), join(summaryPath, "Move.toml"));

    execFileSync(
      "sui",
      [
        "move",
        "summary",
        "--path",
        sourcePath,
        "--output-directory",
        join(summaryPath, "package_summaries"),
        "--quiet",
      ],
      { stdio: "inherit" },
    );

    await generateFromPackageSummary({
      package: { ...packageConfig, path: summaryPath },
      prune: codegenConfig.prune ?? true,
      outputDir,
      globalGenerate: codegenConfig.generate,
      importExtension: codegenConfig.importExtension,
      includePhantomTypeParameters: codegenConfig.includePhantomTypeParameters,
    });
  }
  normalizeGeneratedWhitespace(outputDir);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
