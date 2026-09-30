import { ALL_ADMIN_NAV_ITEMS, findNavItemByPath } from "@/config/admin-nav";
import { isEntityAvailable } from "@/features/help/lib/filter-help";
import type { HelpRegistry, HelpTopic } from "@/features/help/types";

/** Exceptions only — prefer topic.navItemIds matching. */
export const CONTEXTUAL_OVERRIDES: Record<string, string> = {};

function topicIdForNavItem(navItemId: string, registry: HelpRegistry): string | null {
  if (CONTEXTUAL_OVERRIDES[navItemId]) {
    const overrideId = CONTEXTUAL_OVERRIDES[navItemId];
    const override = registry.topicsById.get(overrideId);
    if (override && isEntityAvailable(override)) return overrideId;
  }

  for (const section of registry.sections) {
    for (const topic of section.topics) {
      if (!topic.navItemIds?.includes(navItemId)) continue;
      if (!isEntityAvailable(topic)) continue;
      return topic.id;
    }
  }
  return null;
}

export function resolveContextualTopicId(
  pathname: string,
  registry: HelpRegistry
): string | null {
  if (pathname === "/admin" || pathname === "/admin/") {
    return topicIdForNavItem("dashboard", registry);
  }

  // Exact href against the full nav catalog (not profile-filtered) so nested
  // siblings like /admin/forms/analytics are not mistaken for /admin/forms.
  const exact = ALL_ADMIN_NAV_ITEMS.find((item) => item.href === pathname && item.navItemId);
  if (exact?.navItemId) {
    return topicIdForNavItem(exact.navItemId, registry);
  }

  const navItem = findNavItemByPath(pathname);
  const navItemId = navItem?.navItemId;
  if (!navItemId) return null;

  return topicIdForNavItem(navItemId, registry);
}

export function resolveContextualTopic(
  pathname: string,
  registry: HelpRegistry
): HelpTopic | null {
  const id = resolveContextualTopicId(pathname, registry);
  if (!id) return null;
  return registry.topicsById.get(id) ?? null;
}

export function helpCenterHrefForPath(pathname: string, registry: HelpRegistry): string {
  const topicId = resolveContextualTopicId(pathname, registry);
  if (!topicId) return "/admin/help";
  return `/admin/help#${topicId}`;
}

/** Topic to show in the contextual help panel when the top-bar help button is pressed. */
export function resolvePanelTopicId(pathname: string, registry: HelpRegistry): string | null {
  const contextual = resolveContextualTopicId(pathname, registry);
  if (contextual) return contextual;

  for (const section of registry.sections) {
    const first = section.topics[0];
    if (first) return first.id;
  }
  return null;
}
