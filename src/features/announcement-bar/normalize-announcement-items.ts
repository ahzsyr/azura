import type { AnnouncementItem } from "@/features/announcement-bar/announcement-bar.schema";
import { resolveItemField } from "@/features/marketing-blocks/lib/resolve-item-locale";

export type NormalizedAnnouncementLine = {
  message: string;
  href: string;
  icon?: string;
  badge?: string;
};

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normMessageFromItem(item: AnnouncementItem, locale?: string): {
  message: string;
  icon?: string;
  badge?: string;
} {
  if (locale) {
    const record = item as unknown as Record<string, unknown>;
    const localized = resolveItemField(record, "message", locale);
    if (localized) {
      return {
        message: localized,
        icon: trimString(item.icon) || undefined,
        badge: resolveItemField(record, "badge", locale) || undefined,
      };
    }
  }

  const m = trimString(item.message);
  if (m) {
    return {
      message: m,
      icon: trimString(item.icon) || undefined,
      badge: trimString(item.badge) || undefined,
    };
  }

  const t = locale
    ? resolveItemField(item as unknown as Record<string, unknown>, "title", locale)
    : trimString(item.title) || trimString(item.titleEn);
  const d = locale
    ? resolveItemField(item as unknown as Record<string, unknown>, "description", locale)
    : trimString(item.description) || trimString(item.descriptionEn);

  if (t && d) {
    return {
      message: `${t} — ${d}`,
      icon: trimString(item.icon) || undefined,
      badge: trimString(item.badge) || undefined,
    };
  }

  return {
    message: t || d,
    icon: trimString(item.icon) || undefined,
    badge: trimString(item.badge) || undefined,
  };
}

export function normalizeAnnouncementItems(
  items: AnnouncementItem[] | undefined,
  locale?: string,
): NormalizedAnnouncementLine[] {
  const raw = Array.isArray(items) ? items : [];
  return raw.flatMap((it): NormalizedAnnouncementLine[] => {
    if (!it || typeof it !== "object") return [];
    const { message, icon, badge } = normMessageFromItem(it, locale);
    if (!message) return [];
    const href = trimString(it.linkUrl);
    return [{ message, href, icon, badge }];
  });
}
