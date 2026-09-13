import { seoRepository } from "@/repositories/seo.repository";
import type { SeoGlobalConfig } from "@/features/seo/types";
import { RobotsSettingsClient } from "@/features/seo/admin/robots-settings-client";
import { SeoHealthLayout } from "@/features/seo/operator/components/seo-health-layout";

export default async function AdminRobotsPage() {
  let config: SeoGlobalConfig = {};
  try {
    config = await seoRepository.getGlobalConfig();
  } catch {
    // DB unavailable
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const extraBlocked = config.additionalDisallow ?? [];
  const extraAllowed = config.additionalAllow ?? [];
  const preview = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    ...extraBlocked.map((path) => `Disallow: ${path}`),
    ...extraAllowed.map((path) => `Allow: ${path}`),
    `Sitemap: ${siteUrl}/sitemap_index.xml`,
  ].join("\n");

  return (
    <SeoHealthLayout
      title="Robots.txt"
      status="healthy"
      statusLabel="Generated automatically"
      stats={[
        {
          label: "Allowed",
          value: extraAllowed.length
            ? extraAllowed.join(", ")
            : "Public pages, products, blog, and categories",
        },
        { label: "Blocked", value: ["/admin/*", "/api/*", ...extraBlocked].join(", ") },
        { label: "Sitemap", value: `${siteUrl}/sitemap_index.xml` },
      ]}
      immediate={
        <div className="rounded-lg border bg-muted/40 p-4 text-xs font-mono">
          <p className="mb-2 text-muted-foreground">Generated preview</p>
          <pre>{preview}</pre>
        </div>
      }
      advanced={<RobotsSettingsClient config={config} siteUrl={siteUrl} embedded />}
    />
  );
}
