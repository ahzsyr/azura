import type { Collection } from "@/features/collections/types";
import type { CatalogNavigationItem } from "./types";

/**
 * Heuristic Lucide icon name from category/nav label or slug.
 * Explicit admin icon always wins over this.
 */
export function heuristicLucideIconFromLabel(raw: string | undefined | null): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "layers";

  if (/\bwifi\b|wi-?fi|wireless|access.?point|\buap\b|\bu6\b/.test(s)) return "wifi";
  if (/cloud.?gateway|cloud.?key|gateway|udm|dream.?machine/.test(s)) return "cloud";
  if (/switch|switching|ether|poe/.test(s)) return "server";
  if (/camera|protect|security|surveillance|nvr/.test(s)) return "camera";
  if (/door|access.?control|reader|g2.?reader/.test(s)) return "door-open";
  if (/host|server|rack|advanced.?host/.test(s)) return "hard-drive";
  if (/integrat|dashboard|software|app/.test(s)) return "monitor";
  if (/accessor|cable|adapter|mount|kit/.test(s)) return "package";
  if (/router|routing|network/.test(s)) return "router";
  if (/shield|firewall|secure/.test(s)) return "shield";
  if (/cpu|compute|edge/.test(s)) return "cpu";
  if (/power|ups|pdu/.test(s)) return "cable";
  if (/brand|tag/.test(s)) return "tag";
  if (/product|new|what.?s.?new|megaphone/.test(s)) return "megaphone";
  return "layers";
}

/**
 * Build UniFi-strip fallback items from root PRODUCT categories.
 * Used only when GLOBAL has no configured visible items.
 * Respects showInNav !== false; uses iconImage when present.
 * Does not alphabetize when callers already pass ordered items — we sort
 * roots by name only for this unconfigured fallback path.
 */
export function buildFallbackNavFromCategories(
  collections: Collection[],
): CatalogNavigationItem[] {
  const bySlug = new Map(collections.map((c) => [c.slug, c]));
  const roots = collections.filter((c) => {
    if (c.visible === false) return false;
    if (c.showInNav === false) return false;
    const parent = (c.parentSlug ?? "").trim();
    if (!parent) return true;
    return !bySlug.has(parent);
  });

  return roots
    .slice()
    .sort((a, b) => (a.name || a.slug).localeCompare(b.name || b.slug, undefined, { sensitivity: "base" }))
    .map((c, index) => {
      const iconImage = (c.iconImage && String(c.iconImage).trim()) || undefined;
      const lucide = heuristicLucideIconFromLabel(`${c.name} ${c.slug}`);
      return {
        id: `fallback-cat-${c.slug}`,
        label: c.name || c.slug,
        icon: iconImage ?? lucide,
        iconType: iconImage ? ("image" as const) : ("lucide" as const),
        targetType: "CATEGORY" as const,
        targetId: c.slug,
        sortOrder: index,
        visible: true,
      };
    });
}

/**
 * Resolve display icon for a nav item.
 * Priority: custom image → configured Lucide → label/slug heuristic → layers.
 */
export function resolveNavItemIcon(item: CatalogNavigationItem): {
  icon: string;
  iconType: "image" | "lucide";
} {
  const raw = (item.icon ?? "").trim();
  if (item.iconType === "image" || raw.startsWith("/") || raw.startsWith("http") || raw.startsWith("data:")) {
    if (raw) return { icon: raw, iconType: "image" };
  }
  if (item.iconType === "lucide" && raw) {
    return { icon: raw, iconType: "lucide" };
  }
  if (raw && !raw.startsWith("/") && !raw.startsWith("http") && !raw.startsWith("data:")) {
    return { icon: raw, iconType: "lucide" };
  }
  const heuristic = heuristicLucideIconFromLabel(
    `${item.label} ${item.targetId ?? ""}`,
  );
  return { icon: heuristic, iconType: "lucide" };
}
