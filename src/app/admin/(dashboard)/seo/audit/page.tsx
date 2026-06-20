import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { seoRepository } from "@/repositories/seo.repository";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { scoreSeoMeta } from "@/features/seo/scoring/seo-scoring.service";
import { bulkFillSeoMetadataAction, revalidateRichResultsAction } from "@/features/seo/actions";
import { seoQualityService } from "@/features/seo/quality/seo-quality.service";
import type { SeoQualityIssue } from "@/features/seo/quality/types";
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

function severityBadge(severity: SeoQualityIssue["severity"]) {
  if (severity === "critical") return <Badge className="bg-red-600 text-white border-transparent">Critical</Badge>;
  if (severity === "warn") return <Badge className="bg-amber-500">Warning</Badge>;
  return <Badge variant="outline">Info</Badge>;
}

export default async function SeoAuditPage() {
  let pageMetas: Awaited<ReturnType<typeof seoRepository.listPageKeyMeta>> = [];
  let cmsPages: { id: string; slug: string; titleEn: string }[] = [];
  let posts: { id: string; slug: string; titleEn: string }[] = [];
  let technicalIssues: SeoQualityIssue[] = [];
  let health: Awaited<ReturnType<typeof seoQualityService.buildReport>>["health"];
  let crawlIssues: Awaited<ReturnType<typeof seoRepository.listActiveCrawlIssues>> = [];
  let richIssues: Awaited<ReturnType<typeof seoRepository.listActiveRichResultIssues>> = [];

  try {
    const [cmsRows, postRows] = await Promise.all([
      prisma.cmsPage.findMany({
        select: { id: true, slug: true },
        orderBy: { slug: "asc" },
      }),
      prisma.post.findMany({
        select: { id: true, slug: true },
        orderBy: { slug: "asc" },
      }),
    ]);
    const [cmsTranslations, postTranslations] = await Promise.all([
      loadTranslationsMap("CmsPage", cmsRows.map((p) => p.id)),
      loadTranslationsMap("Post", postRows.map((p) => p.id)),
    ]);
    cmsPages = cmsRows.map((page) => ({
      id: page.id,
      slug: page.slug,
      titleEn: localizedFieldValue(cmsTranslations.get(page.id) ?? [], "title"),
    }));
    posts = postRows.map((post) => ({
      id: post.id,
      slug: post.slug,
      titleEn: localizedFieldValue(postTranslations.get(post.id) ?? [], "title"),
    }));
    pageMetas = await seoRepository.listPageKeyMeta();
    const qualityReport = await seoQualityService.buildReport();
    technicalIssues = qualityReport.issues;
    health = qualityReport.health;
    [crawlIssues, richIssues] = await Promise.all([
      seoRepository.listActiveCrawlIssues(),
      seoRepository.listActiveRichResultIssues(),
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
      href: `/admin/seo?tab=pages&page=${page.pageKey}`,
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

      {health ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              SEO Health: {health.score}/100
              {typeof health.delta === "number" ? (
                <span className="ms-2 text-sm text-muted-foreground">
                  {health.delta >= 0 ? "+" : ""}
                  {health.delta}
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {health.components.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge
                    className={
                      item.status === "fail"
                        ? "bg-red-600 text-white border-transparent"
                        : item.status === "warn"
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crawl diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {crawlIssues.slice(0, 12).map((issue) => (
            <div key={issue.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{issue.type.replace(/_/g, " ")}</p>
                <Badge variant={issue.severity === "INFO" ? "outline" : "secondary"}>{issue.severity}</Badge>
              </div>
              <p className="mt-1 truncate text-muted-foreground">{issue.url}</p>
            </div>
          ))}
          {crawlIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active persisted crawl issues.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rich results monitoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={revalidateRichResultsAction}>
            <Button type="submit" variant="outline">Revalidate rich results</Button>
          </form>
          {richIssues.slice(0, 12).map((issue) => (
            <div key={issue.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{issue.type}</p>
                <Badge className={issue.category === "ERROR" ? "bg-red-600 text-white border-transparent" : "bg-amber-500"}>
                  {issue.eligibility.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="mt-1 truncate text-muted-foreground">{issue.url}</p>
            </div>
          ))}
          {richIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active rich-result issues.</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="rounded-xl border overflow-hidden">
        <div className="border-b bg-muted/30 p-4">
          <h2 className="font-heading text-xl font-semibold">Technical checks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Canonicals, redirects, JSON-LD, and sitemap URL availability.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Severity</th>
              <th className="p-3">Issue</th>
              <th className="p-3">Details</th>
              <th className="p-3 text-end">Fix</th>
            </tr>
          </thead>
          <tbody>
            {technicalIssues.map((issue) => (
              <tr key={issue.id} className="border-t align-top">
                <td className="p-3">{severityBadge(issue.severity)}</td>
                <td className="p-3 font-medium">{issue.title}</td>
                <td className="p-3 text-muted-foreground">{issue.message}</td>
                <td className="p-3 text-end">
                  {issue.href ? (
                    <Link href={issue.href} className="text-primary hover:underline text-xs">
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
        {technicalIssues.length === 0 && (
          <p className="p-6 text-center text-muted-foreground text-sm">
            No technical SEO issues found.
          </p>
        )}
      </div>
    </div>
  );
}
