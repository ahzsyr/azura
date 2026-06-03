"use client";

import { useMemo, useState } from "react";
import type { SeoMeta } from "@prisma/client";
import { upsertSeoMetaAction } from "@/features/seo/actions";
import { ROBOTS_PRESETS } from "@/features/seo/constants";
import { scoreSeoInput } from "@/features/seo/scoring/seo-scoring.service";
import { SeoAnalysisPanel } from "./seo-analysis-panel";
import { SeoSocialPreview } from "./seo-social-preview";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";

type Props = {
  meta?: SeoMeta | null;
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
  defaultTitleEn?: string;
  defaultTitleAr?: string;
  defaultDescEn?: string;
  defaultDescAr?: string;
};

export function SeoMetaForm({
  meta,
  pageKey,
  cmsPageId,
  postId,
  packageId,
  defaultTitleEn = "",
  defaultTitleAr = "",
  defaultDescEn = "",
  defaultDescAr = "",
}: Props) {
  const [activeTab, setActiveTab] = useState<"edit" | "analysis">("edit");
  const [previewLocale, setPreviewLocale] = useState<"en" | "ar">("en");
  const [titleEn, setTitleEn] = useState(meta?.titleEn ?? defaultTitleEn);
  const [titleAr, setTitleAr] = useState(meta?.titleAr ?? defaultTitleAr);
  const [descriptionEn, setDescriptionEn] = useState(meta?.descriptionEn ?? defaultDescEn);
  const [descriptionAr, setDescriptionAr] = useState(meta?.descriptionAr ?? defaultDescAr);
  const [ogTitleEn, setOgTitleEn] = useState(meta?.ogTitleEn ?? "");
  const [ogTitleAr, setOgTitleAr] = useState(meta?.ogTitleAr ?? "");
  const [ogImageUrl, setOgImageUrl] = useState(meta?.ogImageUrl ?? "");
  const [robots, setRobots] = useState(meta?.robots ?? "index, follow");
  const [focusKeywords, setFocusKeywords] = useState(meta?.focusKeywords ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(meta?.canonicalUrl ?? "");
  const [jsonLdStr, setJsonLdStr] = useState(
    meta?.jsonLd != null ? JSON.stringify(meta.jsonLd, null, 2) : ""
  );

  const analysis = useMemo(
    () =>
      scoreSeoInput({
        titleEn,
        titleAr,
        descriptionEn,
        descriptionAr,
        canonicalUrl,
        focusKeywords,
        ogImageUrl,
        ogTitleEn,
        ogTitleAr,
        robots,
        jsonLd: jsonLdStr.trim() ? jsonLdStr : null,
      }),
    [
      titleEn,
      titleAr,
      descriptionEn,
      descriptionAr,
      canonicalUrl,
      focusKeywords,
      ogImageUrl,
      ogTitleEn,
      ogTitleAr,
      robots,
      jsonLdStr,
    ]
  );

  const previewTitle =
    previewLocale === "ar"
      ? ogTitleAr || titleAr || defaultTitleAr
      : ogTitleEn || titleEn || defaultTitleEn;
  const previewDesc = previewLocale === "ar" ? descriptionAr : descriptionEn;

  return (
    <form action={upsertSeoMetaAction} className="space-y-6 rounded-xl border p-6">
      {pageKey && <input type="hidden" name="pageKey" value={pageKey} />}
      {cmsPageId && <input type="hidden" name="cmsPageId" value={cmsPageId} />}
      {postId && <input type="hidden" name="postId" value={postId} />}
      {packageId && <input type="hidden" name="packageId" value={packageId} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border p-0.5">
          {(["edit", "analysis"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1 text-xs capitalize ${activeTab === tab ? "bg-primary text-primary-foreground" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === "edit" && (
          <div className="flex gap-1 rounded-lg border p-0.5">
            {(["en", "ar"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPreviewLocale(l)}
                className={`rounded-md px-2 py-1 text-xs ${previewLocale === l ? "bg-primary text-primary-foreground" : ""}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === "analysis" ? (
        <SeoAnalysisPanel result={analysis} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Meta title (EN)</Label>
                  <Input name="titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Meta title (AR)</Label>
                  <Input name="titleAr" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Meta description (EN)</Label>
                <Textarea
                  name="descriptionEn"
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Meta description (AR)</Label>
                <Textarea
                  name="descriptionAr"
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  rows={3}
                  dir="rtl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Focus keywords</Label>
                <Input
                  name="focusKeywords"
                  value={focusKeywords}
                  onChange={(e) => setFocusKeywords(e.target.value)}
                  placeholder="umrah, packages, madinah"
                />
                <p className="text-xs text-muted-foreground">Comma-separated</p>
              </div>
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input
                  name="canonicalUrl"
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://yoursite.com/en/page"
                />
              </div>
              <div className="space-y-2">
                <Label>Robots</Label>
                <select
                  name="robots"
                  value={robots}
                  onChange={(e) => setRobots(e.target.value)}
                  className="w-full border rounded-md h-10 px-3"
                >
                  {ROBOTS_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SeoSocialPreview
              locale={previewLocale}
              title={previewTitle}
              description={previewDesc}
              ogImage={ogImageUrl || undefined}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
            <div className="space-y-2">
              <Label>OG title override (EN)</Label>
              <Input name="ogTitleEn" value={ogTitleEn} onChange={(e) => setOgTitleEn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>OG title override (AR)</Label>
              <Input name="ogTitleAr" value={ogTitleAr} onChange={(e) => setOgTitleAr(e.target.value)} dir="rtl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <MediaPickerField
                label="OG / social image"
                urlFieldName="ogImageUrl"
                url={ogImageUrl}
                onChange={({ url }) => setOgImageUrl(url)}
                trackMediaId={false}
                idFieldName=""
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter card</Label>
              <select
                name="twitterCard"
                defaultValue={meta?.twitterCard ?? "summary_large_image"}
                className="w-full border rounded-md h-10 px-3"
              >
                <option value="summary_large_image">Large image</option>
                <option value="summary">Summary</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label>JSON-LD (optional)</Label>
            <Textarea
              name="jsonLd"
              value={jsonLdStr}
              onChange={(e) => setJsonLdStr(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder='{"@context":"https://schema.org","@type":"WebPage",...}'
            />
            <p className="text-xs text-muted-foreground">
              Valid JSON object or array. Merged on the public page when set.
            </p>
          </div>

          <Button type="submit">Save SEO</Button>

          {meta?.id ? (
            <LocaleTabPanel
              entityType="SeoMeta"
              entityId={meta.id}
              sourceData={{
                metaTitle: titleEn,
                metaDescription: descriptionEn,
                ogTitle: ogTitleEn,
                focusKeywords,
              }}
            />
          ) : pageKey ? (
            <LocaleTabPanel
              entityType="SeoSettings"
              entityId={pageKey}
              sourceData={{
                siteTitle: titleEn,
                siteDescription: descriptionEn,
              }}
            />
          ) : cmsPageId ? (
            <LocaleTabPanel
              entityType="SeoMeta"
              entityId={cmsPageId}
              sourceData={{
                metaTitle: titleEn,
                metaDescription: descriptionEn,
                ogTitle: ogTitleEn,
                focusKeywords,
              }}
            />
          ) : postId ? (
            <LocaleTabPanel
              entityType="SeoMeta"
              entityId={postId}
              sourceData={{
                metaTitle: titleEn,
                metaDescription: descriptionEn,
                ogTitle: ogTitleEn,
                focusKeywords,
              }}
            />
          ) : null}
        </>
      )}
    </form>
  );
}
