import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const contractsDir = new URL("../src/contracts/", import.meta.url).pathname;
const directBcsAnchor = 'import type {} from "@mysten/bcs";';

async function generatedFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? generatedFiles(path)
        : Promise.resolve(entry.name.endsWith(".ts") ? [path] : []);
    }),
  );
  return files.flat();
}

for (const path of await generatedFiles(contractsDir)) {
  const original = await readFile(path, "utf8");
  let formatted = original
    .split("\n")
    .filter((line) => line !== directBcsAnchor)
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");

  formatted = formatted.replace(
    /^(import .* from '@mysten\/sui\/bcs';)$/m,
    `$1\n${directBcsAnchor}`,
  );
  if (formatted !== original) await writeFile(path, formatted);
}
