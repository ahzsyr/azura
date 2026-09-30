const fs = require("fs");
const path = require("path");
const root = "src/app/admin/(dashboard)";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === "page.tsx") acc.push(p.split(path.sep).join("/"));
  }
  return acc;
}

function toRoute(f) {
  let r = f.replace("src/app/admin/(dashboard)", "/admin");
  if (r.endsWith("/page.tsx")) r = r.slice(0, -"/page.tsx".length);
  return r || "/admin";
}

const routes = walk(root).map(toRoute).sort();

function classify(route) {
  const editorExact = new Set([
    "/admin/pages/[id]",
    "/admin/pages/new",
    "/admin/posts/[id]",
    "/admin/posts/new",
    "/admin/content/[typeSlug]/[id]",
    "/admin/content/[typeSlug]/new",
    "/admin/forms/[id]",
    "/admin/forms/new",
    "/admin/theme",
    "/admin/products",
    "/admin/catalog-products",
    "/admin/collections",
    "/admin/catalog-collections",
    "/admin/categories",
    "/admin/media",
    "/admin/header",
    "/admin/footer",
    "/admin/gallery/[id]",
    "/admin/gallery/new",
    "/admin/faqs/[id]",
    "/admin/faqs/new",
    "/admin/knowledge-base/[id]",
    "/admin/knowledge-base/new",
    "/admin/documentation/[id]",
    "/admin/documentation/new",
    "/admin/status/[id]",
    "/admin/status/new",
    "/admin/partners/[id]",
    "/admin/partners/new",
    "/admin/team/[id]",
    "/admin/team/new",
    "/admin/releases/[id]",
    "/admin/releases/new",
    "/admin/pricing-plans/[id]",
    "/admin/pricing-plans/new",
    "/admin/pricing-calculators/[id]",
    "/admin/pricing-calculators/new",
    "/admin/testimonials/collections/[id]",
    "/admin/testimonials/collections/new",
    "/admin/packages/[id]",
    "/admin/packages/new",
    "/admin/hotels/[id]",
    "/admin/hotels/new",
    "/admin/services/[id]",
    "/admin/services/new",
    "/admin/surveys/[id]",
    "/admin/surveys/new",
    "/admin/users/[id]",
    "/admin/demo-profiles/[slug]",
    "/admin/content/types/[id]",
    "/admin/content/types/new",
  ]);

  const settingsExact = new Set([
    "/admin/catalog-taxonomy",
    "/admin/catalog/settings",
    "/admin/catalog/navigation",
    "/admin/languages",
    "/admin/translations",
    "/admin/company",
    "/admin/settings/account",
    "/admin/settings/portal",
    "/admin/settings/site",
    "/admin/settings/search",
    "/admin/seo/redirects",
    "/admin/seo/sitemap",
    "/admin/seo/robots",
    "/admin/seo/structured-data",
    "/admin/seo/404",
    "/admin/seo/google-tags",
    "/admin/seo/google",
    "/admin/seo/integrations",
    "/admin/seo/settings",
    "/admin/seo/metadata",
    "/admin/announcement-bar",
    "/admin/preloader",
    "/admin/popups",
    "/admin/product-listing-filters",
    "/admin/marketing/settings",
    "/admin/marketing/automation",
    "/admin/marketing/conversions",
    "/admin/marketing/tracking",
    "/admin/marketing/campaigns",
    "/admin/marketing/platforms",
    "/admin/marketing/urls",
    "/admin/marketing/publishing",
  ]);

  const handoffs = {
    "/admin/pages/[id]": ["seo-tab"],
    "/admin/posts/[id]": ["seo-tab"],
    "/admin/content/[typeSlug]/[id]": ["seo-tab"],
  };

  const configMap = {
    "/admin/pages/[id]": "cmsPageEditor",
    "/admin/pages/new": "cmsPageEditor",
    "/admin/posts/[id]": "cmsPostEditor",
    "/admin/posts/new": "cmsPostEditor",
    "/admin/content/[typeSlug]/[id]": "contentItemEditor",
    "/admin/content/[typeSlug]/new": "contentItemEditor",
    "/admin/forms/[id]": "formDesigner",
    "/admin/forms/new": "formDesigner",
    "/admin/theme": "themeStudio",
    "/admin/products": "productEditor",
    "/admin/catalog-products": "productEditor",
    "/admin/collections": "collectionsEditor",
    "/admin/catalog-collections": "collectionsEditor",
    "/admin/categories": "collectionsEditor",
    "/admin/media": "mediaLibrary",
    "/admin/settings/search": "searchSettings",
    "/admin/catalog-taxonomy": "settingsSavePublish",
    "/admin/catalog/settings": "settingsSavePublish",
    "/admin/languages": "settingsSaveCancel",
    "/admin/translations": "settingsSaveCancel",
    "/admin/settings/account": "settingsSaveCancel",
    "/admin/settings/portal": "settingsSaveCancel",
    "/admin/settings/site": "settingsSaveCancel",
    "/admin/company": "settingsSaveCancel",
    "/admin/header": "entityEditor",
    "/admin/footer": "entityEditor",
    "/admin/seo/redirects": "settingsSaveCancel",
    "/admin/seo/sitemap": "settingsSaveCancel",
    "/admin/seo/robots": "settingsSaveCancel",
    "/admin/seo/structured-data": "settingsSaveCancel",
    "/admin/seo/404": "settingsSaveCancel",
    "/admin/seo/google-tags": "settingsSaveCancel",
    "/admin/seo/google": "settingsSaveCancel",
    "/admin/seo/integrations": "settingsSaveCancel",
    "/admin/seo/settings": "settingsSaveCancel",
    "/admin/seo/metadata": "settingsSaveCancel",
    "/admin/marketing/settings": "settingsSaveOnly",
    "/admin/marketing/automation": "settingsSaveOnly",
    "/admin/marketing/conversions": "settingsSaveOnly",
    "/admin/marketing/tracking": "settingsSaveOnly",
    "/admin/marketing/campaigns": "settingsSaveOnly",
    "/admin/marketing/platforms": "settingsSaveOnly",
    "/admin/marketing/urls": "settingsSaveOnly",
    "/admin/marketing/publishing": "settingsSaveOnly",
    "/admin/users/[id]": "entityEditor",
    "/admin/demo-profiles/[slug]": "entityEditor",
  };

  const strategyMap = {
    "/admin/pages/[id]": "provider",
    "/admin/pages/new": "provider",
    "/admin/posts/[id]": "provider",
    "/admin/posts/new": "provider",
    "/admin/content/[typeSlug]/[id]": "provider",
    "/admin/content/[typeSlug]/new": "provider",
    "/admin/theme": "provider",
    "/admin/products": "patch",
    "/admin/catalog-products": "patch",
    "/admin/collections": "hook",
    "/admin/catalog-collections": "hook",
    "/admin/categories": "hook",
    "/admin/forms/[id]": "hook",
    "/admin/forms/new": "hook",
    "/admin/media": "hook",
  };

  if (editorExact.has(route)) {
    return {
      routePattern: route,
      mode: "editor",
      configKey: configMap[route] || "entityEditor",
      registrationStrategy: strategyMap[route] || "provider",
      handoffScopes: handoffs[route],
    };
  }
  if (settingsExact.has(route)) {
    return {
      routePattern: route,
      mode: "settings",
      configKey: configMap[route] || "settingsSaveCancel",
      registrationStrategy: strategyMap[route] || "hook",
    };
  }

  const listRoutes = new Set([
    "/admin/pages",
    "/admin/posts",
    "/admin/forms",
    "/admin/faqs",
    "/admin/gallery",
    "/admin/users",
    "/admin/team",
    "/admin/partners",
    "/admin/releases",
    "/admin/services",
    "/admin/hotels",
    "/admin/packages",
    "/admin/surveys",
    "/admin/testimonials",
    "/admin/knowledge-base",
    "/admin/documentation",
    "/admin/status",
    "/admin/content",
    "/admin/content/[typeSlug]",
    "/admin/forms/analytics",
    "/admin/form-submissions",
    "/admin/form-submissions/[id]",
    "/admin/inquiries",
    "/admin/inquiries/[id]",
    "/admin/demo-profiles",
    "/admin/content/types",
    "/admin/posts/authors",
    "/admin/posts/categories",
    "/admin/posts/tags",
    "/admin/testimonials/collections",
    "/admin/pricing-plans",
    "/admin/pricing-calculators",
  ]);

  if (listRoutes.has(route)) {
    return {
      routePattern: route,
      mode: "list",
      configKey: "list",
      registrationStrategy: "none",
    };
  }

  return {
    routePattern: route,
    mode: "dashboard",
    configKey: "dashboard",
    registrationStrategy: "none",
  };
}

const entries = routes.map(classify);
const lines = [];
lines.push("/**");
lines.push(" * CI architecture contract for admin routes.");
lines.push(" * expectedActions live in ADMIN_PAGE_CONFIGS (via configKey), not here.");
lines.push(" */");
lines.push("");
lines.push('import type { AdminPageMode } from "@/config/admin-page-config";');
lines.push('import type { AdminPageConfigKey } from "@/config/admin-page-configs";');
lines.push("");
lines.push("export type AdminRegistrationStrategy =");
lines.push('  | "provider"');
lines.push('  | "patch"');
lines.push('  | "hook"');
lines.push('  | "child-handoff"');
lines.push('  | "none";');
lines.push("");
lines.push("export type AdminActionInventoryEntry = {");
lines.push("  routePattern: string;");
lines.push("  mode: AdminPageMode;");
lines.push("  /** Key into ADMIN_PAGE_CONFIGS — runtime expectedActions source of truth. */");
lines.push("  configKey: AdminPageConfigKey;");
lines.push("  registrationStrategy: AdminRegistrationStrategy;");
lines.push("  handoffScopes?: string[];");
lines.push("  notes?: string;");
lines.push("};");
lines.push("");
lines.push("export const ADMIN_ACTION_INVENTORY: AdminActionInventoryEntry[] = [");
for (const e of entries) {
  const parts = [
    `routePattern: ${JSON.stringify(e.routePattern)}`,
    `mode: ${JSON.stringify(e.mode)}`,
    `configKey: ${JSON.stringify(e.configKey)}`,
    `registrationStrategy: ${JSON.stringify(e.registrationStrategy)}`,
  ];
  if (e.handoffScopes) {
    parts.push(`handoffScopes: ${JSON.stringify(e.handoffScopes)}`);
    parts.push(
      `notes: "Parent editor; SEO tab uses child-handoff via useAdminPageActions priority"`,
    );
  }
  lines.push(`  { ${parts.join(", ")} },`);
}
lines.push("];");
lines.push("");
lines.push(
  "export function getInventoryEntry(routePattern: string): AdminActionInventoryEntry | undefined {",
);
lines.push("  return ADMIN_ACTION_INVENTORY.find((e) => e.routePattern === routePattern);");
lines.push("}");
lines.push("");

fs.writeFileSync("src/config/admin-action-inventory.ts", lines.join("\n"));
console.log("Wrote", entries.length, "entries");
