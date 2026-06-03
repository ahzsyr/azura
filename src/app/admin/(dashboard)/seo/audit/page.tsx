import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { scoreSeoMeta } from "@/features/seo/scoring/seo-scoring.service";
import { bulkFillSeoMetadataAction } from "@/features/seo/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  label: string;
  href: string | null;
  score: number;
  grade: string;
};

function gradeBadge(score: number) {
  if (score >= 80) return <Badge className="bg-emerald-600">{score}</Badge>;
  if (score >= 55) return <Badge className="bg-amber-500">{score}</Badge>;
  return <Badge className="bg-red-600 text-white border-transparent">{score}</Badge>;
}

export default async function SeoAuditPage() {
  let pageMetas: Awaited<ReturnType<typeof seoRepository.listPageKeyMeta>> = [];
  let cmsPages: { id: string; slug: string; titleEn: string }[] = [];
  let posts: { id: string; slug: string; titleEn: string }[] = [];

  try {
    [pageMetas, cmsPages, posts] = await Promise.all([
      seoRepository.listPageKeyMeta(),
      prisma.cmsPage.findMany({
        select: { id: true, slug: true, titleEn: true },
        orderBy: { slug: "asc" },
      }),
      prisma.post.findMany({
        select: { id: true, slug: true, titleEn: true },
        orderBy: { slug: "asc" },
      }),
    ]);
  } catch {
    // DB unavailable
  }

  const metaByKey = Object.fromEntries(
    pageMetas.filter((m) => m.pageKey).map((m) => [m.pageKey!, m])
  );

  const rows: AuditRow[] = [];

  for (const page of STATIC_SEO_PAGES) {
    const meta = metaByKey[page.pageKey] ?? null;
    const result = scoreSeoMeta(meta);
    rows.push({
      id: `static-${page.pageKey}`,
      label: page.label,
      href: "/admin/seo",
      score: result.score,
      grade: result.grade,
    });
  }

  for (const page of cmsPages) {
    const meta = await seoRepository.getByCmsPageId(page.id);
    const result = scoreSeoMeta(meta);
    rows.push({
      id: `cms-${page.id}`,
      label: `CMS: ${page.titleEn}`,
      href: `/admin/pages/${page.id}`,
      score: result.score,
      grade: result.grade,
    });
  }

  for (const post of posts) {
    const meta = await seoRepository.getByPostId(post.id);
    const result = scoreSeoMeta(meta);
    rows.push({
      id: `post-${post.id}`,
      label: `Post: ${post.titleEn}`,
      href: `/admin/posts/${post.id}`,
      score: result.score,
      grade: result.grade,
    });
  }

  rows.sort((a, b) => a.score - b.score);
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-semibold">SEO Audit</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Basic on-page SEO scores for static pages, CMS pages, and blog posts. Lower scores appear first.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pages audited</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{rows.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Average score</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{avg}/100</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Needs work (&lt;55)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-red-600">
            {rows.filter((r) => r.score < 55).length}
          </CardContent>
        </Card>
      </div>

      <form action={bulkFillSeoMetadataAction} className="rounded-xl border p-4 flex flex-wrap items-end gap-4">
        <div>
          <p className="font-medium text-sm">Bulk metadata fill</p>
          <p className="text-xs text-muted-foreground mt-1">
            Fill empty SEO titles and descriptions from page/post titles and excerpts.
          </p>
        </div>
        <select name="scope" className="border rounded-md h-10 px-3 text-sm" defaultValue="all">
          <option value="all">All scopes</option>
          <option value="static">Static pages only</option>
          <option value="cms">CMS pages only</option>
          <option value="posts">Blog posts only</option>
        </select>
        <select name="mode" className="border rounded-md h-10 px-3 text-sm" defaultValue="empty-only">
          <option value="empty-only">Empty fields only</option>
          <option value="always">Overwrite all</option>
        </select>
        <Button type="submit">Run bulk fill</Button>
      </form>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Page</th>
              <th className="p-3">Score</th>
              <th className="p-3 text-end">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.label}</td>
                <td className="p-3">{gradeBadge(row.score)}</td>
                <td className="p-3 text-end">
                  {row.href ? (
                    <Link href={row.href} className="text-primary hover:underline text-xs">
                      Open
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-muted-foreground text-sm">No pages to audit.</p>
        )}
      </div>
    </div>
  );
}
