/**
 * Seeds header workspace from seeds/catalog/header.json into JsonStore.
 * Use --force to overwrite an existing workspace.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { navigationRepository } from "@/features/navigation/navigation.repository";
import type { HeaderWorkspace } from "@/features/navigation/types";

async function main() {
  const force = process.argv.includes("--force");
  const existing = await navigationRepository.get();
  if (existing?.menusDatabase && !force) {
    console.log("Header workspace already seeded — skipping (use --force to overwrite)");
    return;
  }

  const path = join(process.cwd(), "seeds", "catalog", "header.json");
  const raw = await readFile(path, "utf-8");
  const data = JSON.parse(raw) as HeaderWorkspace;

  await navigationRepository.save(data);
  console.log(
    force
      ? "Overwrote header workspace from seeds/catalog/header.json"
      : "Seeded header workspace from seeds/catalog/header.json",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
