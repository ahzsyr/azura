import type { AnnouncementItem } from "@/features/announcement-bar/announcement-bar.schema";
import {
  resolveItemField,
  type ResolveItemFieldOptions,
} from "@/features/builder/blocks/marketing/lib/resolve-item-locale";

export type NormalizedAnnouncementLine = {
  message: string;
  href: string;
  icon?: string;
  badge?: string;
};

export type NormalizeAnnouncementItemsOptions = ResolveItemFieldOptions & {
  locale?: string;
};

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normMessageFromItem(
  item: AnnouncementItem,
  locale: string,
  options?: ResolveItemFieldOptions,
): {
  message: string;
  icon?: string;
  badge?: string;
} {
  const record = item as unknown as Record<string, unknown>;
  const message = resolveItemField(record, "message", locale, options);
  if (message) {
    return {
      message,
      icon: trimString(item.icon) || undefined,
      badge: resolveItemField(record, "badge", locale, options) || undefined,
    };
  }

  const title = resolveItemField(record, "title", locale, options);
  const description = resolveItemField(record, "description", locale, options);

  if (title && description) {
    return {
      message: `${title} — ${description}`,
      icon: trimString(item.icon) || undefined,
      badge: resolveItemField(record, "badge", locale, options) || undefined,
    };
  }

  return {
    message: title || description,
    icon: trimString(item.icon) || undefined,
    badge: resolveItemField(record, "badge", locale, options) || undefined,
  };
}

export function normalizeAnnouncementItems(
  items: AnnouncementItem[] | undefined,
  options?: NormalizeAnnouncementItemsOptions,
): NormalizedAnnouncementLine[] {
  const locale = options?.locale ?? "en";
  const { locale: _locale, ...resolveOptions } = options ?? {};
  const raw = Array.isArray(items) ? items : [];
  return raw.flatMap((it): NormalizedAnnouncementLine[] => {
    if (!it || typeof it !== "object") return [];
    const { message, icon, badge } = normMessageFromItem(it, locale, resolveOptions);
    if (!message) return [];
    const href = trimString(it.linkUrl);
    return [{ message, href, icon, badge }];
  });
}
