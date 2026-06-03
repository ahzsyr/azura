/**
 * Extracts inline base64 logos from header workspace into public/uploads/branding/
 * and updates src/data/header.json + JsonStore workspace.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { navigationRepository } from "@/features/navigation/navigation.repository";
import type { BrandingState, HeaderWorkspace } from "@/features/navigation/types";

async function persistDataUrl(dataUrl: string, baseName: string): Promise<string> {
  const match = /^data:image\/([\w+.-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return "";

  const rawExt = match[1].toLowerCase().replace("jpeg", "jpg");
  const ext = rawExt === "svg+xml" ? "svg" : rawExt;
  const buffer = Buffer.from(match[2], "base64");
  const dir = join(process.cwd(), "public", "uploads", "branding");
  await mkdir(dir, { recursive: true });
  const fileName = `${baseName}.${ext}`;
  await writeFile(join(dir, fileName), buffer);
  return `/uploads/branding/${fileName}`;
}

async function migrateBranding(branding: BrandingState): Promise<BrandingState> {
  const next = { ...branding };
  let changed = false;

  if (next.logoImageLightUrl?.startsWith("data:")) {
    const url = await persistDataUrl(next.logoImageLightUrl, "logo-light");
    if (url) {
      next.logoImageLightUrl = url;
      changed = true;
    }
  }
  if (next.logoImageDarkUrl?.startsWith("data:")) {
    const url = await persistDataUrl(next.logoImageDarkUrl, "logo-dark");
    if (url) {
      next.logoImageDarkUrl = url;
      changed = true;
    }
  }
  if (next.logoImageUrl?.startsWith("data:")) {
    const url = await persistDataUrl(next.logoImageUrl, "logo");
    if (url) {
      next.logoImageUrl = url;
      changed = true;
    }
  }

  if (!changed) return branding;
  return next;
}

async function migrateWorkspace(workspace: HeaderWorkspace): Promise<HeaderWorkspace> {
  const branding = await migrateBranding(workspace.branding);
  if (branding === workspace.branding) return workspace;
  return { ...workspace, branding };
}

async function main() {
  const headerPath = join(process.cwd(), "src", "data", "header.json");
  const raw = await readFile(headerPath, "utf-8");
  const headerJson = JSON.parse(raw) as HeaderWorkspace;
  const migratedHeader = await migrateWorkspace(headerJson);
  await writeFile(headerPath, `${JSON.stringify(migratedHeader, null, 2)}\n`, "utf-8");
  console.log("Updated src/data/header.json");

  const stored = await navigationRepository.get();
  if (stored) {
    const migratedStored = await migrateWorkspace(stored);
    await navigationRepository.save(migratedStored);
    console.log("Updated header-workspace in database");
  } else {
    console.log("No header-workspace in database — run catalog:seed-header after this if needed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
