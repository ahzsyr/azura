import type { MenuItem } from "./types";
import { countTotalItems } from "./menu-engine";
import { countMaxDepth, flattenMenuTree } from "./menu-tree-service";

export type MenuAnalytics = {
  total: number;
  visible: number;
  hidden: number;
  draft: number;
  scheduled: number;
  desktop: number;
  mobile: number;
  megaMenus: number;
  maxDepth: number;
};

export function getMenuAnalytics(items: MenuItem[]): MenuAnalytics {
  const flat = flattenMenuTree(items);
  let visible = 0;
  let hidden = 0;
  let draft = 0;
  let scheduled = 0;
  let desktop = 0;
  let mobile = 0;
  let megaMenus = 0;

  for (const node of flat) {
    const item = node.item;
    const visibility = item.visibility ?? "visible";
    if (visibility === "visible") visible += 1;
    if (visibility === "hidden") hidden += 1;
    if (visibility === "draft") draft += 1;
    if (visibility === "scheduled") scheduled += 1;
    if (item.placement === "desktop" || item.placement === "both") desktop += 1;
    if (item.placement === "mobile" || item.placement === "both") mobile += 1;
    if ((item.children?.length ?? 0) > 0 && item.megaMenuType) megaMenus += 1;
  }

  return {
    total: countTotalItems(items),
    visible,
    hidden,
    draft,
    scheduled,
    desktop,
    mobile,
    megaMenus,
    maxDepth: countMaxDepth(items),
  };
}

export const MenuAnalyticsService = {
  getMenuAnalytics,
};
