import { seoRepository } from "@/repositories/seo.repository";
import type { SeoGlobalConfig } from "@/features/seo/types";
import { upsertSeoGlobalAction } from "@/features/seo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default async function AdminRobotsPage() {
  let config: SeoGlobalConfig = {};
  try {
    config = await seoRepository.getGlobalConfig();
  } catch {
    // DB unavailable
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/seo" className="text-sm text-primary hover:underline">
          ← SEO
        </Link>
        <h1 className="font-heading text-3xl font-semibold mt-2">Robots.txt</h1>
        <p className="text-muted-foreground mt-1">
          Base rules always disallow <code>/admin/</code> and <code>/api/</code>. Add paths below (one per line).
        </p>
      </div>

      <form action={upsertSeoGlobalAction} className="space-y-4 rounded-xl border p-6">
        <div className="space-y-2">
          <Label>Host (optional)</Label>
          <Input name="host" defaultValue={config.host ?? siteUrl} placeholder={siteUrl} />
        </div>
        <div className="space-y-2">
          <Label>Additional disallow paths</Label>
          <Textarea
            name="additionalDisallow"
            rows={5}
            defaultValue={(config.additionalDisallow ?? []).join("\n")}
            placeholder="/private&#10;/draft"
          />
        </div>
        <div className="space-y-2">
          <Label>Additional allow paths</Label>
          <Textarea
            name="additionalAllow"
            rows={3}
            defaultValue={(config.additionalAllow ?? []).join("\n")}
            placeholder="/public-api"
          />
        </div>
        <Button type="submit">Save robots config</Button>
      </form>

      <div className="rounded-lg border bg-muted/40 p-4 text-xs font-mono">
        <p className="text-muted-foreground mb-2">Live preview: GET /robots.txt</p>
        <pre>{`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/${(config.additionalDisallow ?? []).map((p) => `\nDisallow: ${p}`).join("")}
Sitemap: ${siteUrl}/sitemap.xml`}</pre>
      </div>
    </div>
  );
}
