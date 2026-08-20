"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { iconRepository } from "@/repositories/icon.repository";
import { builtinIcons } from "./lib/builtin-icons";
import { indexIconSearch, removeIconSearch } from "./lib/index-icon-search";
import type { IconSource } from "@prisma/client";
import type { IconListItem } from "./types";

const BUILTIN_LIBRARY_ID = "builtin-lucide";

function toPickSource(source: string): "builtin" | "custom" | "font" {
  if (source === "CUSTOM") return "custom";
  if (source === "FONT") return "font";
  return "builtin";
}

export async function ensureBuiltinIcons() {
  const p = prisma as any;
  if (!p?.iconLibrary?.upsert || !p?.iconAsset?.upsert) return;

  try {
    await p.iconLibrary.upsert({
      where: { slug: BUILTIN_LIBRARY_ID },
      update: {
        enabled: true,
        source: "BUILTIN",
        version: "lucide-react",
        provider: "lucide-react",
        name: "Built-in icons (lucide-react)",
      },
      create: {
        id: BUILTIN_LIBRARY_ID,
        name: "Built-in icons (lucide-react)",
        slug: BUILTIN_LIBRARY_ID,
        description: null,
        provider: "lucide-react",
        source: "BUILTIN",
        version: "lucide-react",
        enabled: true,
      },
    });

    for (const entry of Object.values(builtinIcons)) {
      const row = await p.iconAsset.upsert({
        where: { id: entry.id },
        update: {
          enabled: true,
          libraryId: BUILTIN_LIBRARY_ID,
          name: entry.name,
          slug: entry.slug,
          category: entry.category ?? null,
          tags: entry.tags ? entry.tags : null,
          source: "BUILTIN",
          type: "COMPONENT",
          iconName: entry.iconName,
        },
        create: {
          id: entry.id,
          libraryId: BUILTIN_LIBRARY_ID,
          name: entry.name,
          slug: entry.slug,
          category: entry.category ?? null,
          tags: entry.tags ? entry.tags : null,
          source: "BUILTIN",
          type: "COMPONENT",
          iconName: entry.iconName,
          enabled: true,
        },
      });
      await indexIconSearch({
        id: row.id,
        name: row.name,
        slug: row.slug,
        category: row.category,
        source: row.source,
        tags: row.tags,
      });
    }
  } catch (e) {
    // During rollout, `/admin/media` can be rendered before icon tables/migrations exist.
    // We don't want the entire admin page to hard-crash in that case.
    console.error("[ensureBuiltinIcons] failed", e);
  }
}

export async function fetchIcons(params?: {
  search?: string;
  source?: IconSource | "ALL";
}): Promise<IconListItem[]> {
  await requireAdmin();
  await ensureBuiltinIcons();

  let dbIcons: IconListItem[] = [];
  try {
    const rows = await iconRepository.listIcons({
      search: params?.search,
      source: params?.source && params.source !== "ALL" ? params.source : undefined,
      enabled: true,
    });
    dbIcons = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      source: toPickSource(row.source),
      category: row.category,
      type: row.type,
    }));
  } catch (e) {
    // During rollout, icon tables/migrations can be missing temporarily.
    // Treat as empty DB and fall back to registry built-ins below.
    console.error("[fetchIcons] listIcons failed", e);
  }

  const items: IconListItem[] = dbIcons;

  // If DB empty (migration pending), fall back to registry-only builtins.
  if (items.length === 0 && (!params?.source || params.source === "ALL" || params.source === "BUILTIN")) {
    const q = params?.search?.trim().toLowerCase();
    return Object.values(builtinIcons)
      .filter((e) => {
        if (!q) return true;
        return (
          e.id.includes(q) ||
          e.name.toLowerCase().includes(q) ||
          (e.category ?? "").includes(q)
        );
      })
      .map((e) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        source: "builtin" as const,
        category: e.category,
        type: "COMPONENT",
      }));
  }

  return items;
}

export async function getIconDetail(id: string) {
  await requireAdmin();
  return iconRepository.getIcon(id);
}

export async function deleteIconAsset(id: string) {
  await requireAdmin();
  const icon = await iconRepository.getIcon(id);
  if (!icon) return { success: false, error: "Icon not found" };
  if (icon.source === "BUILTIN") {
    return { success: false, error: "Built-in icons cannot be deleted" };
  }
  const usageCount = (icon as { _count?: { usages: number } })._count?.usages ?? 0;
  if (usageCount > 0) {
    return { success: false, error: `Icon is used in ${usageCount} place(s)` };
  }
  await iconRepository.deleteIcon(id);
  await removeIconSearch(id);
  revalidatePath("/admin/media");
  return { success: true };
}

export type FontGlyphInput = {
  name: string;
  glyph: string;
  unicode?: string;
  glyphKey?: string;
  category?: string;
};

export async function registerFontLibrary(data: {
  name: string;
  slug: string;
  fontFamily: string;
  cssClass?: string;
  mediaId?: string | null;
  glyphs: FontGlyphInput[];
}) {
  await requireAdmin();
  const slug = data.slug.trim();
  const libraryId = `font-${slug}`;

  await iconRepository.upsertLibrary({
    id: libraryId,
    slug,
    name: data.name.trim(),
    description: `Font icon library: ${data.fontFamily}`,
    provider: data.fontFamily,
    source: "FONT",
    enabled: true,
  } as any);

  const p = prisma as any;
  if (!p?.iconAsset?.upsert) {
    return { success: false, error: "Icon storage not configured" };
  }

  for (const glyph of data.glyphs) {
    const glyphSlug = glyph.glyphKey?.trim() || glyph.glyph.trim();
    const iconId = `${libraryId}-${glyphSlug.replace(/\s+/g, "-").toLowerCase()}`;
    const row = await p.iconAsset.upsert({
      where: { id: iconId },
      update: {
        enabled: true,
        libraryId,
        name: glyph.name.trim(),
        slug: glyphSlug,
        category: glyph.category ?? "font",
        source: "FONT",
        type: "FONT",
        fontFamily: data.fontFamily,
        glyph: glyph.glyph,
        unicode: glyph.unicode ?? null,
        glyphKey: glyph.glyphKey ?? glyphSlug,
        mediaId: data.mediaId ?? null,
      },
      create: {
        id: iconId,
        libraryId,
        name: glyph.name.trim(),
        slug: glyphSlug,
        category: glyph.category ?? "font",
        source: "FONT",
        type: "FONT",
        fontFamily: data.fontFamily,
        glyph: glyph.glyph,
        unicode: glyph.unicode ?? null,
        glyphKey: glyph.glyphKey ?? glyphSlug,
        mediaId: data.mediaId ?? null,
        enabled: true,
      },
    });
    await indexIconSearch({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      source: row.source,
      tags: row.tags,
    });
  }

  revalidatePath("/admin/media");
  return { success: true, libraryId };
}

/** @deprecated use fetchIcons */
export async function listIcons(): Promise<{ icons: IconListItem[] }> {
  const icons = await fetchIcons();
  return { icons };
}
