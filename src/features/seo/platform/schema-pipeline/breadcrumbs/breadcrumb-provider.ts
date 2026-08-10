import type { BreadcrumbItem, SchemaContext } from "../types";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";

export type BreadcrumbProvider = {
  id: string;
  supports(ctx: SchemaContext): boolean;
  resolve(ctx: SchemaContext): BreadcrumbItem[];
};

export const staticPageBreadcrumbProvider: BreadcrumbProvider = {
  id: "static-page",
  supports(ctx) {
    return ctx.page.pageType === "static" && ctx.page.path !== "/";
  },
  resolve(ctx) {
    const prefix = `/${ctx.runtime.localePrefix}`;
    const staticPage = STATIC_SEO_PAGES.find((page) => page.path === ctx.page.path);
    const label = staticPage?.label ?? ctx.page.title;
    return [
      { name: "Home", href: prefix || "/" },
      { name: label, href: `${prefix}${ctx.page.path}` },
    ];
  },
};

export const faqBreadcrumbProvider: BreadcrumbProvider = {
  id: "faq",
  supports(ctx) {
    return ctx.page.pageType === "faq";
  },
  resolve(ctx) {
    const prefix = `/${ctx.runtime.localePrefix}`;
    const segments = ctx.page.path.split("/").filter(Boolean);
    const faqSlug = segments[segments.length - 1];
    return [
      { name: "Home", href: prefix || "/" },
      { name: ctx.page.title || faqSlug, href: `${prefix}${ctx.page.path}` },
    ];
  },
};

export const productBreadcrumbProvider: BreadcrumbProvider = {
  id: "product",
  supports(ctx) {
    return ctx.page.pageType === "product";
  },
  resolve(ctx) {
    const prefix = `/${ctx.runtime.localePrefix}`;
    const items = ctx.page.breadcrumbItems;
    if (items.length) return items;
    return [
      { name: "Home", href: prefix || "/" },
      { name: "Products", href: `${prefix}/products` },
      { name: ctx.page.title, href: `${prefix}${ctx.page.path}` },
    ];
  },
};

export const blogBreadcrumbProvider: BreadcrumbProvider = {
  id: "blog",
  supports(ctx) {
    return ctx.page.pageType === "blog";
  },
  resolve(ctx) {
    const prefix = `/${ctx.runtime.localePrefix}`;
    return [
      { name: "Home", href: prefix || "/" },
      { name: "Blog", href: `${prefix}/blog` },
      { name: ctx.page.title, href: `${prefix}${ctx.page.path}` },
    ];
  },
};

export const collectionBreadcrumbProvider: BreadcrumbProvider = {
  id: "collection",
  supports(ctx) {
    return ctx.page.pageType === "collection";
  },
  resolve(ctx) {
    const prefix = `/${ctx.runtime.localePrefix}`;
    const items = ctx.page.breadcrumbItems;
    if (items.length) return items;
    return [
      { name: "Home", href: prefix || "/" },
      { name: ctx.page.title, href: `${prefix}${ctx.page.path}` },
    ];
  },
};

export const defaultBreadcrumbProviders: BreadcrumbProvider[] = [
  productBreadcrumbProvider,
  faqBreadcrumbProvider,
  blogBreadcrumbProvider,
  collectionBreadcrumbProvider,
  staticPageBreadcrumbProvider,
];

export function resolveBreadcrumbs(ctx: SchemaContext): BreadcrumbItem[] {
  const provider = defaultBreadcrumbProviders.find((entry) => entry.supports(ctx));
  return provider?.resolve(ctx) ?? [];
}
