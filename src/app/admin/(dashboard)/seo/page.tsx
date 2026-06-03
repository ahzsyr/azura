import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { SeoMetaForm } from "@/features/seo/components/seo-meta-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Route, AlertCircle, Bot, Braces, FileText } from "lucide-react";

export default async function AdminSeoPage() {
  let pageMetas: Awaited<ReturnType<typeof seoRepository.listPageKeyMeta>> = [];
  let cmsCount = 0;
  let postCount = 0;

  try {
    [pageMetas, cmsCount, postCount] = await Promise.all([
      seoRepository.listPageKeyMeta(),
      prisma.cmsPage.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);
  } catch {
    // DB not connected
  }

  const metaByKey = Object.fromEntries(
    pageMetas.filter((m) => m.pageKey).map((m) => [m.pageKey!, m])
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-semibold">SEO</h1>
        <p className="mt-2 text-muted-foreground">
          Per-page meta, Open Graph, Twitter cards, JSON-LD, robots, and global tools.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/seo/redirects">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-2">
              <Route className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Redirects</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">301/302 rules</CardContent>
          </Card>
        </Link>
        <Link href="/admin/seo/404">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">404 pages</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">EN / AR copy</CardContent>
          </Card>
        </Link>
        <Link href="/admin/seo/robots">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Robots.txt</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Allow / disallow paths</CardContent>
          </Card>
        </Link>
        <Link href="/admin/seo/structured-data">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader className="pb-2">
              <Braces className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Structured data</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Global JSON-LD</CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Dynamic content
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>{cmsCount} published CMS pages — edit SEO on each page in Pages.</p>
          <p>{postCount} published blog posts — edit SEO on each post in Blog.</p>
          <p>Packages — SEO fields on package edit (when available).</p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Static pages</h2>
        {STATIC_SEO_PAGES.map((page) => (
          <div key={page.pageKey}>
            <p className="text-sm font-medium mb-2">
              {page.label}{" "}
              <span className="text-muted-foreground font-normal">({page.path || "/"})</span>
            </p>
            <SeoMetaForm
              pageKey={page.pageKey}
              meta={metaByKey[page.pageKey] ?? null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
