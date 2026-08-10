import type {
  HelpInventoryBundle,
  HelpInventoryPage,
  HelpPageKind,
} from "@/features/help/inventory/types";
import { ADMIN_DASHBOARD, ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import { INVENTORY_ACTIONS } from "@/features/help/inventory/entities/actions";
import { INVENTORY_COMPONENTS } from "@/features/help/inventory/entities/components";
import { INVENTORY_DIALOGS } from "@/features/help/inventory/entities/dialogs";
import { INVENTORY_FIELDS } from "@/features/help/inventory/entities/fields";
import { INVENTORY_SECTIONS } from "@/features/help/inventory/entities/sections";
import { INVENTORY_TABLES } from "@/features/help/inventory/entities/tables";
import { INVENTORY_TABS } from "@/features/help/inventory/entities/tabs";
import { PAGE_INVENTORY_OVERRIDES } from "@/features/help/inventory/pages/overrides";

const HUB_BY_GROUP: Record<string, string> = {
  dashboard: "section-getting-started",
  content: "section-content",
  media: "section-media",
  marketing: "section-marketing",
  modules: "section-advanced",
  design: "section-design",
  seo: "section-seo",
  settings: "section-settings",
  system: "section-advanced",
};

function inferPageKind(navItemId: string, label: string): HelpPageKind {
  const id = navItemId.toLowerCase();
  const l = label.toLowerCase();
  if (
    id.includes("overview") ||
    id.includes("dashboard") ||
    id.includes("hub") ||
    id.includes("analytics") ||
    id.includes("monitoring") ||
    id === "dashboard" ||
    id === "marketing-dashboard"
  ) {
    return "dashboard";
  }
  if (
    id.includes("history") ||
    id.includes("issues") ||
    id.includes("submissions") ||
    id.includes("leads") ||
    l.includes("submissions")
  ) {
    return "table";
  }
  if (
    id.includes("audit") ||
    id.includes("recommendations") ||
    id.includes("rules") ||
    id.includes("schemas") ||
    id.includes("templates")
  ) {
    return "informational";
  }
  return "action";
}

function hubForGroup(groupId: string, navItemId: string): string {
  if (navItemId.startsWith("seo-")) return "section-seo";
  if (navItemId === "languages" || navItemId === "translations") return "section-languages";
  if (navItemId === "performance") return "section-performance";
  if (
    navItemId === "form-templates" ||
    navItemId.includes("form") ||
    navItemId === "newsletter" ||
    navItemId === "inquiries"
  ) {
    return "section-forms";
  }
  if (navItemId.startsWith("marketing-")) return "section-marketing";
  if (groupId === "marketing" && !navItemId.includes("form")) return "section-marketing";
  return HUB_BY_GROUP[groupId] ?? "section-getting-started";
}

const CONTENT_NAV_IDS = new Set([
  "pages",
  "blog",
  "products",
  "services",
  "packages",
  "properties",
  "team",
  "partners",
  "faqs",
  "testimonials",
  "gallery",
  "knowledge-base",
  "releases",
  "pricing-plans",
]);

function basePage(
  navItemId: string,
  href: string,
  label: string,
  groupId: string
): HelpInventoryPage {
  const contentLike = CONTENT_NAV_IDS.has(navItemId);
  const pageKind = inferPageKind(navItemId, label);

  return {
    id: `page-${navItemId}`,
    kind: "page",
    version: 1,
    label,
    navItemId,
    href,
    pageKind,
    hubSectionId: hubForGroup(groupId, navItemId),
    description: `${label} administration surface.`,
    componentIds: contentLike
      ? ["component-seo-meta", "component-media-picker", "component-locale-fields"]
      : navItemId === "seo-metadata"
        ? ["component-seo-meta", "component-locale-fields"]
        : undefined,
    tableIds: pageKind === "table" ? ["table-admin-list"] : undefined,
    actionIds: ["action-save", "action-publish", "action-preview"].filter((id) => {
      if (pageKind === "informational") return id === "action-save";
      return true;
    }),
    sectionIds: contentLike ? ["section-shared-seo", "section-shared-media"] : undefined,
  };
}

function collectNavPages(): HelpInventoryPage[] {
  const pages: HelpInventoryPage[] = [];

  const push = (navItemId: string, href: string, label: string, groupId: string) => {
    const base = basePage(navItemId, href, label, groupId);
    const override = PAGE_INVENTORY_OVERRIDES[navItemId];
    pages.push(override ? { ...base, ...override, id: base.id, navItemId, href, label } : base);
  };

  push(
    ADMIN_DASHBOARD.navItemId!,
    ADMIN_DASHBOARD.href,
    ADMIN_DASHBOARD.label,
    "dashboard"
  );

  for (const group of ADMIN_NAV_GROUPS) {
    const list = group.sections?.length
      ? group.sections.flatMap((s) => s.items)
      : group.items;
    for (const item of list) {
      if (!item.navItemId) continue;
      push(item.navItemId, item.href, item.label, group.id);
    }
  }

  return pages;
}

export function buildHelpInventoryBundle(): HelpInventoryBundle {
  return {
    pages: collectNavPages(),
    tabs: INVENTORY_TABS,
    sections: INVENTORY_SECTIONS,
    components: INVENTORY_COMPONENTS,
    fields: INVENTORY_FIELDS,
    dialogs: INVENTORY_DIALOGS,
    tables: INVENTORY_TABLES,
    actions: INVENTORY_ACTIONS,
  };
}

export const helpInventory: HelpInventoryBundle = buildHelpInventoryBundle();

/** @deprecated Prefer entity modules under inventory/entities */
export const SHARED_FIELDS = INVENTORY_FIELDS;
export const SHARED_ACTIONS = INVENTORY_ACTIONS;
export const SHARED_COMPONENTS = INVENTORY_COMPONENTS;
export const SHARED_SECTIONS = INVENTORY_SECTIONS;
export const SHARED_TABLES = INVENTORY_TABLES;
