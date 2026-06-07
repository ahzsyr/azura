"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SeoMeta } from "@prisma/client";
import {
  AlertCircle,
  Bot,
  Braces,
  FileText,
  Route,
  Search,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { StaticPagesSeoPanel } from "@/features/seo/admin/static-pages-seo-panel";

export const ADMIN_SEO_TABS = [
  { id: "overview", label: "Overview" },
  { id: "tools", label: "Global tools" },
  { id: "pages", label: "Static pages" },
] as const;

export type AdminSeoTabId = (typeof ADMIN_SEO_TABS)[number]["id"];

type Props = {
  metaByKey: Record<string, SeoMeta>;
  cmsCount: number;
  postCount: number;
};

function isValidTab(id: string | null): id is AdminSeoTabId {
  return ADMIN_SEO_TABS.some((t) => t.id === id);
}

const TOOL_LINKS = [
  {
    href: "/admin/seo/audit",
    icon: Search,
    title: "SEO audit",
    description: "Score and fix issues across pages",
  },
  {
    href: "/admin/seo/redirects",
    icon: Route,
    title: "Redirects",
    description: "301/302 URL rules",
  },
  {
    href: "/admin/seo/robots",
    icon: Bot,
    title: "Robots.txt",
    description: "Allow / disallow crawl paths",
  },
  {
    href: "/admin/seo/structured-data",
    icon: Braces,
    title: "Structured data",
    description: "Global JSON-LD schemas",
  },
  {
    href: "/admin/seo/404",
    icon: AlertCircle,
    title: "404 pages",
    description: "EN / AR not-found copy",
  },
] as const;

export function AdminSeoHub({ metaByKey, cmsCount, postCount }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(
    () => (isValidTab(tabParam) ? tabParam : "overview"),
    [tabParam],
  );

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`/admin/seo?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader
        title="SEO"
        description="Per-page meta, Open Graph, Twitter cards, JSON-LD, robots, and global tools."
      />

      <AdminSettingsLayout
        tabs={[...ADMIN_SEO_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {(tab) => {
          if (tab === "overview") {
            return (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        CMS pages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{cmsCount}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Published</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Blog posts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{postCount}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Published</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Static routes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{STATIC_SEO_PAGES.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Marketing pages</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" aria-hidden />
                      Dynamic content
                    </CardTitle>
                    <CardDescription>
                      SEO for CMS pages, blog posts, and packages is edited on each entity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">{cmsCount}</span> published CMS
                      pages — open any page under{" "}
                      <Link href="/admin/pages" className="text-primary hover:underline">
                        Pages
                      </Link>
                      .
                    </p>
                    <p>
                      <span className="font-medium text-foreground">{postCount}</span> published
                      blog posts — edit SEO on each post in{" "}
                      <Link href="/admin/posts" className="text-primary hover:underline">
                        Blog
                      </Link>
                      .
                    </p>
                    <p>Packages — SEO fields on the package editor when available.</p>
                  </CardContent>
                </Card>
              </div>
            );
          }

          if (tab === "tools") {
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TOOL_LINKS.map((tool) => (
                  <Link key={tool.href} href={tool.href}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader className="pb-2">
                        <tool.icon className="h-5 w-5 text-primary" aria-hidden />
                        <CardTitle className="text-base">{tool.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {tool.description}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            );
          }

          return <StaticPagesSeoPanel metaByKey={metaByKey} />;
        }}
      </AdminSettingsLayout>
    </div>
  );
}
