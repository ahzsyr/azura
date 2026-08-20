"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { SearchEntityType } from "@prisma/client";
import { pushRecentlyViewed } from "@/features/builder/blocks/discovery/lib/recently-viewed.storage";

type TrackerPayload = {
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  urlPath: string;
  imageUrl?: string;
};

function parseDataAttribute(el: Element | null): TrackerPayload | null {
  if (!el) return null;
  const raw = el.getAttribute("data-recently-viewed");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrackerPayload;
  } catch {
    return null;
  }
}

function inferFromPathname(
  pathname: string,
  locale: string
): TrackerPayload | null {
  const parts = pathname.split("/").filter(Boolean);
  const localeIdx = parts[0] === locale ? 1 : 0;
  const segment = parts[localeIdx];
  const slug = parts[localeIdx + 1];
  if (!segment || !slug) return null;

  if (segment === "products") {
    return {
      entityType: SearchEntityType.CATALOG_PRODUCT,
      entityId: slug,
      title: slug,
      urlPath: `/${locale}/products/${slug}`,
    };
  }
  if (segment === "blog") {
    return {
      entityType: SearchEntityType.POST,
      entityId: slug,
      title: slug,
      urlPath: `/${locale}/blog/${slug}`,
    };
  }
  if (segment === "content") {
    return {
      entityType: SearchEntityType.CONTENT_ITEM,
      entityId: slug,
      title: slug,
      urlPath: `/${locale}/content/${slug}`,
    };
  }
  return null;
}

export function RecentlyViewedTracker() {
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    const explicit = parseDataAttribute(document.querySelector("[data-recently-viewed]"));
    const payload = explicit ?? inferFromPathname(pathname, locale);
    if (!payload?.entityId || !payload.title) return;

    pushRecentlyViewed(locale, {
      entityType: payload.entityType,
      entityId: payload.entityId,
      title: payload.title,
      urlPath: payload.urlPath.startsWith("/")
        ? payload.urlPath
        : `/${locale}${payload.urlPath}`,
      imageUrl: payload.imageUrl,
    });
  }, [pathname, locale]);

  return null;
}
