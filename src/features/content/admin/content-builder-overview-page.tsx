"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getContentBuilderNavGroup,
  type AdminNavItem,
  type AdminNavSection,
} from "@/config/admin-nav";
import {
  AdminCardGrid,
  AdminPageHeader,
  AdminStaggerContainer,
  AdminStaggerItem,
} from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentBuilderOverviewStats } from "@/features/content/admin/content-builder-overview-stats";

const CARD_DESCRIPTIONS: Record<string, string> = {
  pages: "Wired marketing routes and custom CMS pages.",
  blog: "Articles, authors, categories, and tags.",
  "content-types": "Catalog content types, items, collections, and schemas.",
  products: "Product catalog, SKUs, and listings.",
  categories: "Category trees and collection rules.",
  "brands-tags": "Brand and tag taxonomy for listings.",
  "catalog-navigation": "Category and brand listing navigation.",
  "product-listing-filters": "Facets and listing filters.",
  "catalog-sync": "Preview and apply category sync.",
  "catalog-settings": "Catalog taxonomy and listing policy.",
  team: "Team directory and member profiles.",
  partners: "Partner programs and listings.",
  "knowledge-base": "Help articles and knowledge categories.",
  "pricing-plans": "Public pricing plans and features.",
  releases: "Changelogs and version notes.",
  faqs: "FAQ sets shown on the public site.",
  testimonials: "Reviews and testimonial collections.",
  gallery: "Photo and media albums.",
  "pricing-calculators": "Interactive pricing calculators.",
  policies: "Privacy and other policy pages.",
  terms: "Terms of service and related pages.",
};

function itemDescription(item: AdminNavItem): string {
  if (item.navItemId && CARD_DESCRIPTIONS[item.navItemId]) {
    return CARD_DESCRIPTIONS[item.navItemId];
  }
  return `Open ${item.label} in Content Builder.`;
}

function countLabel(item: AdminNavItem, count: number | undefined): string | null {
  if (count == null) return null;
  if (item.href === "/admin/content") {
    return `${count} ${count === 1 ? "item" : "items"}`;
  }
  return String(count);
}

function NavCard({
  item,
  count,
}: {
  item: AdminNavItem;
  count: number | undefined;
}) {
  const Icon = item.icon;
  const badge = countLabel(item, count);
  return (
    <Link href={item.href} className="block h-full">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {badge ? (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="mt-2 text-base">{item.label}</CardTitle>
          <CardDescription className="text-xs">{itemDescription(item)}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto pt-0">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            Open
            <ArrowRight className="h-3 w-3" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function HeadlineStat({
  item,
  count,
}: {
  item: AdminNavItem;
  count: number;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="block h-full">
      <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          <Icon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums tracking-tight">{count}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

const HEADLINE_HREFS = [
  "/admin/pages",
  "/admin/posts",
  "/admin/content",
  "/admin/products",
  "/admin/team",
  "/admin/faqs",
];

type Props = {
  stats: ContentBuilderOverviewStats;
};

export function ContentBuilderOverviewPage({ stats }: Props) {
  const group = getContentBuilderNavGroup();
  const sections = (group?.sections ?? []).filter((section) => section.id !== "overview");
  const allItems = sections.flatMap((section) => section.items);
  const headlineItems = HEADLINE_HREFS.map((href) => allItems.find((item) => item.href === href)).filter(
    (item): item is AdminNavItem => Boolean(item),
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Content Builder"
        description="Statistics and shortcuts across Core Pages, Catalog, Organization, and Site content. Catalog types live under Catalog → Content."
      />

      {headlineItems.length > 0 ? (
        <AdminCardGrid columns={4}>
          {headlineItems.map((item) => (
            <HeadlineStat key={item.href} item={item} count={stats[item.href] ?? 0} />
          ))}
        </AdminCardGrid>
      ) : null}

      <AdminStaggerContainer className="space-y-8">
        {sections.map((section) => (
          <SectionCards key={section.id} section={section} stats={stats} />
        ))}
      </AdminStaggerContainer>
    </div>
  );
}

function SectionCards({
  section,
  stats,
}: {
  section: AdminNavSection;
  stats: ContentBuilderOverviewStats;
}) {
  if (section.items.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="admin-section-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {section.label}
      </h2>
      <AdminCardGrid columns={3}>
        {section.items.map((item) => (
          <AdminStaggerItem key={item.href}>
            <NavCard item={item} count={stats[item.href]} />
          </AdminStaggerItem>
        ))}
      </AdminCardGrid>
    </section>
  );
}
