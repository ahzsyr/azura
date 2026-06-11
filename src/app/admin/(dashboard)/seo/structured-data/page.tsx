import Link from "next/link";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoStructuredConfig } from "@/features/seo/types";
import { upsertStructuredDataAction } from "@/features/seo/actions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function AdminStructuredDataPage() {
  let config: SeoStructuredConfig = {};
  let withJsonLd: { pageKey: string | null; titleEn: string; entityType: string | null }[] = [];

  try {
    [config, withJsonLd] = await Promise.all([
      seoRepository.getStructuredConfig(),
      prisma.seoMeta.findMany({
        select: { pageKey: true, titleEn: true, entityType: true, jsonLd: true },
        take: 50,
      }).then((rows) => rows.filter((r) => r.jsonLd != null)),
    ]);
  } catch {
    // DB unavailable
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/seo" className="text-sm text-primary hover:underline">
          ← SEO
        </Link>
        <h1 className="font-heading text-3xl font-semibold mt-2">Structured data</h1>
        <p className="text-muted-foreground mt-1">
          Global JSON-LD injected on all pages. Per-page JSON-LD is set in page/post SEO panels.
        </p>
      </div>

      <form action={upsertStructuredDataAction} className="space-y-4 rounded-xl border p-6">
        <div className="space-y-2">
          <Label>Organization schema (JSON)</Label>
          <Textarea
            name="organization"
            rows={12}
            className="font-mono text-xs"
            defaultValue={
              config.organization
                ? JSON.stringify(config.organization, null, 2)
                : ""
            }
            placeholder='{"@context":"https://schema.org","@type":"TravelAgency",...}'
          />
        </div>
        <div className="space-y-2">
          <Label>WebSite schema (JSON, optional)</Label>
          <Textarea
            name="website"
            rows={8}
            className="font-mono text-xs"
            defaultValue={config.website ? JSON.stringify(config.website, null, 2) : ""}
          />
        </div>
        <Button type="submit">Save global schemas</Button>
      </form>

      {withJsonLd.length > 0 && (
        <div className="rounded-xl border p-4">
          <h2 className="font-semibold mb-2">Per-page JSON-LD</h2>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {withJsonLd.map((m, i) => (
              <li key={i}>
                {m.pageKey ?? m.entityType ?? "entity"} — {m.titleEn}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
