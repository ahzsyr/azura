import { seoRepository } from "@/repositories/seo.repository";
import { SeoHealthLayout } from "@/features/seo/operator/components/seo-health-layout";
import { LlmsTxtSettingsClient } from "@/features/seo/admin/llms-txt-settings-client";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import type { SeoLlmsConfig } from "@/features/seo/types";
import {
  countLlmsDocument,
  createEmptyLlmsDocument,
  formatLlmsTxt,
  normalizeLlmsDocument,
} from "@/features/seo/llms/llms-document";

export default async function AdminLlmsTxtPage() {
  let savedConfig: SeoLlmsConfig | null = null;
  try {
    const raw = await seoRepository.getLlmsConfig();
    savedConfig = raw ? normalizeLlmsDocument(raw) : null;
  } catch {
    // DB unavailable — the editor still loads with a safe starter document.
  }

  const identity = await resolveSiteIdentityFromDb().catch(getDefaultSiteIdentity);
  let siteOrigin = getDefaultSiteIdentity().domain
    ? `https://${getDefaultSiteIdentity().domain}`
    : "https://brt-me.com";
  try {
    siteOrigin = (await resolveSiteOrigin("admin-preview")).replace(/\/$/, "");
  } catch {
    // keep fallback origin
  }

  const initialDocument =
    savedConfig ??
    createEmptyLlmsDocument({
      title: identity.brandName,
      summary: identity.tagline,
    });
  const stats = countLlmsDocument(initialDocument);
  const publicUrl = `${siteOrigin}/llms.txt`;
  const preview = formatLlmsTxt(initialDocument);

  return (
    <SeoHealthLayout
      title="LLMs.txt"
      status={savedConfig ? "healthy" : "attention"}
      statusLabel={savedConfig ? "Published" : "Not configured"}
      stats={[
        { label: "Public file", value: publicUrl },
        { label: "Sections", value: String(stats.sections) },
        { label: "Links", value: String(stats.links) },
        { label: "Size", value: `${stats.bytes.toLocaleString()} bytes` },
        {
          label: "Last saved",
          value: savedConfig?.updatedAt
            ? new Date(savedConfig.updatedAt).toLocaleString()
            : "Not saved yet",
        },
      ]}
      attention={
        savedConfig
          ? []
          : [
              "No saved llms.txt document yet. Generate a draft from published content or add sections manually, then save.",
            ]
      }
      immediate={
        <section className="space-y-3 rounded-xl border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Current public file</h2>
              <p className="text-sm text-muted-foreground">
                Served at{" "}
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline"
                >
                  {publicUrl}
                </a>
              </p>
            </div>
          </div>
          <pre className="max-h-[24rem] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs font-mono whitespace-pre-wrap">
            {preview}
          </pre>
          <p className="text-xs text-muted-foreground">
            The saved file is served at <code>/llms.txt</code>. Saving and publishing refresh the
            route through the existing SEO cache tags.
          </p>
        </section>
      }
      advanced={
        <LlmsTxtSettingsClient
          savedConfig={savedConfig}
          initialDocument={initialDocument}
          publicUrl={publicUrl}
          siteOrigin={siteOrigin}
          embedded
        />
      }
    />
  );
}
