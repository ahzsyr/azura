"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import type { SeoMeta } from "@prisma/client";
import { upsertSeoMetaAction } from "@/features/seo/actions";
import { ROBOTS_PRESETS } from "@/features/seo/constants";
import { scoreSeoInput } from "@/features/seo/scoring/seo-scoring.service";
import { SeoAnalysisPanel } from "./seo-analysis-panel";
import { SeoSocialPreview } from "./seo-social-preview";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { getLegacyDefault } from "@/features/translation/components/localized-fields";

type LocaleSeoSlice = {
  title: string;
  description: string;
  ogTitle: string;
};

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
  /** When true, renders a div instead of form (for use inside another form). */
  embedded?: boolean;
};

function buildInitialByLocale(
  meta: SeoMeta | null | undefined,
  defaults: {
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
  }
): Record<string, LocaleSeoSlice> {
  return {
    en: {
      title: meta?.titleEn ?? defaults.titleEn,
      description: meta?.descriptionEn ?? defaults.descEn,
      ogTitle: meta?.ogTitleEn ?? "",
    },
    ar: {
      title: meta?.titleAr ?? defaults.titleAr,
      description: meta?.descriptionAr ?? defaults.descAr,
      ogTitle: meta?.ogTitleAr ?? "",
    },
  };
}

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
  embedded = false,
}: Props) {
  const { activeLocaleCode, activeLocale, defaultCode, isRtl } = useAdminEditingLocale();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"edit" | "analysis">("edit");
  const [byLocale, setByLocale] = useState<Record<string, LocaleSeoSlice>>(() =>
    buildInitialByLocale(meta, {
      titleEn: defaultTitleEn,
      titleAr: defaultTitleAr,
      descEn: defaultDescEn,
      descAr: defaultDescAr,
    })
  );
  const [ogImageUrl, setOgImageUrl] = useState(meta?.ogImageUrl ?? "");
  const [robots, setRobots] = useState(meta?.robots ?? "index, follow");
  const [focusKeywords, setFocusKeywords] = useState(meta?.focusKeywords ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(meta?.canonicalUrl ?? "");
  const [jsonLdStr, setJsonLdStr] = useState(
    meta?.jsonLd != null ? JSON.stringify(meta.jsonLd, null, 2) : ""
  );
  const [twitterCard, setTwitterCard] = useState(meta?.twitterCard ?? "summary_large_image");

  const activeSlice = byLocale[activeLocaleCode] ?? { title: "", description: "", ogTitle: "" };
  const englishSlice = byLocale[defaultCode] ?? byLocale.en ?? { title: "", description: "", ogTitle: "" };

  const patchActive = useCallback(
    (patch: Partial<LocaleSeoSlice>) => {
      setByLocale((prev) => {
        const current = prev[activeLocaleCode] ?? { title: "", description: "", ogTitle: "" };
        return {
          ...prev,
          [activeLocaleCode]: { ...current, ...patch },
        };
      });
    },
    [activeLocaleCode]
  );

  const buildFormData = () => {
    const en = byLocale.en ?? englishSlice;
    const ar = byLocale.ar ?? { title: "", description: "", ogTitle: "" };
    const fd = new FormData();
    if (pageKey) fd.set("pageKey", pageKey);
    if (cmsPageId) fd.set("cmsPageId", cmsPageId);
    if (postId) fd.set("postId", postId);
    if (packageId) fd.set("packageId", packageId);
    fd.set("titleEn", en.title);
    fd.set("titleAr", ar.title);
    fd.set("descriptionEn", en.description);
    fd.set("descriptionAr", ar.description);
    fd.set("focusKeywords", focusKeywords);
    fd.set("canonicalUrl", canonicalUrl);
    fd.set("robots", robots);
    fd.set("ogTitleEn", en.ogTitle);
    fd.set("ogTitleAr", ar.ogTitle);
    fd.set("ogImageUrl", ogImageUrl);
    fd.set("twitterCard", twitterCard);
    fd.set("jsonLd", jsonLdStr);
    return fd;
  };

  const handleEmbeddedSubmit = () => {
    startTransition(async () => {
      await upsertSeoMetaAction(buildFormData());
    });
  };

  const fieldName = (name: string): string | undefined => (embedded ? undefined : name);

  const titleEn = byLocale.en?.title ?? "";
  const titleAr = byLocale.ar?.title ?? "";
  const descriptionEn = byLocale.en?.description ?? "";
  const descriptionAr = byLocale.ar?.description ?? "";
  const ogTitleEn = byLocale.en?.ogTitle ?? "";
  const ogTitleAr = byLocale.ar?.ogTitle ?? "";

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

  const previewLocale = activeLocaleCode === "ar" ? "ar" : "en";
  const previewTitle =
    activeSlice.ogTitle ||
    activeSlice.title ||
    (activeLocaleCode === "ar" ? defaultTitleAr : defaultTitleEn) ||
    englishSlice.title;
  const previewDesc =
    activeSlice.description ||
    (activeLocaleCode === "ar" ? defaultDescAr : defaultDescEn) ||
    englishSlice.description;

  const titlePlaceholder = getLegacyDefault(
    { titleEn: englishSlice.title, titleAr: byLocale.ar?.title },
    "title",
    activeLocaleCode
  );
  const descPlaceholder = getLegacyDefault(
    { descriptionEn: englishSlice.description, descriptionAr: byLocale.ar?.description },
    "description",
    activeLocaleCode
  );

  const shellClassName = "space-y-6 rounded-xl border p-6";
  const fields = (
    <>
      {!embedded && pageKey && <input type="hidden" name="pageKey" value={pageKey} />}
      {!embedded && cmsPageId && <input type="hidden" name="cmsPageId" value={cmsPageId} />}
      {!embedded && postId && <input type="hidden" name="postId" value={postId} />}
      {!embedded && packageId && <input type="hidden" name="packageId" value={packageId} />}

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
          <p className="text-xs text-muted-foreground">
            Editing SEO for {activeLocale.flag} {activeLocale.label} — use the language menu in the top bar
            to switch.
          </p>
        )}
      </div>

      {activeTab === "analysis" ? (
        <SeoAnalysisPanel result={analysis} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Meta title ({activeLocale.label})</Label>
                <Input
                  name={
                    activeLocaleCode === "en"
                      ? fieldName("titleEn")
                      : activeLocaleCode === "ar"
                        ? fieldName("titleAr")
                        : undefined
                  }
                  value={activeSlice.title}
                  onChange={(e) => patchActive({ title: e.target.value })}
                  dir={isRtl ? "rtl" : undefined}
                  placeholder={
                    activeLocaleCode !== defaultCode && !activeSlice.title.trim()
                      ? englishSlice.title || titlePlaceholder
                      : undefined
                  }
                  required={activeLocaleCode === defaultCode}
                />
              </div>
              <div className="space-y-2">
                <Label>Meta description ({activeLocale.label})</Label>
                <Textarea
                  name={
                    activeLocaleCode === "en"
                      ? fieldName("descriptionEn")
                      : activeLocaleCode === "ar"
                        ? fieldName("descriptionAr")
                        : undefined
                  }
                  value={activeSlice.description}
                  onChange={(e) => patchActive({ description: e.target.value })}
                  rows={3}
                  dir={isRtl ? "rtl" : undefined}
                  placeholder={
                    activeLocaleCode !== defaultCode && !activeSlice.description.trim()
                      ? englishSlice.description || descPlaceholder
                      : undefined
                  }
                  required={activeLocaleCode === defaultCode}
                />
              </div>
              {activeLocaleCode !== defaultCode && englishSlice.title.trim() ? (
                <p className="text-xs text-muted-foreground">
                  Empty fields on the live site fall back to English.
                </p>
              ) : null}
              <div className="space-y-2">
                <Label>Focus keywords</Label>
                <Input
                  name={fieldName("focusKeywords")}
                  value={focusKeywords}
                  onChange={(e) => setFocusKeywords(e.target.value)}
                  placeholder="umrah, packages, madinah"
                />
                <p className="text-xs text-muted-foreground">Comma-separated (shared across languages)</p>
              </div>
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input
                  name={fieldName("canonicalUrl")}
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://yoursite.com/en/page"
                />
              </div>
              <div className="space-y-2">
                <Label>Robots</Label>
                <select
                  name={fieldName("robots")}
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

          <div className="grid gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label>OG title override ({activeLocale.label})</Label>
              <Input
                name={
                  activeLocaleCode === "en"
                    ? fieldName("ogTitleEn")
                    : activeLocaleCode === "ar"
                      ? fieldName("ogTitleAr")
                      : undefined
                }
                value={activeSlice.ogTitle}
                onChange={(e) => patchActive({ ogTitle: e.target.value })}
                dir={isRtl ? "rtl" : undefined}
                placeholder={englishSlice.ogTitle || undefined}
              />
            </div>
            <div className="space-y-2">
              <UrlPrimaryMediaPickerField
                label="OG / social image"
                url={ogImageUrl}
                onChange={(url) => setOgImageUrl(url)}
              />
              {!embedded ? <input type="hidden" name="ogImageUrl" value={ogImageUrl} readOnly /> : null}
            </div>
            <div className="space-y-2">
              <Label>Twitter card</Label>
              <select
                name={fieldName("twitterCard")}
                value={twitterCard}
                onChange={(e) => setTwitterCard(e.target.value)}
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
              name={fieldName("jsonLd")}
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

          <Button
            type={embedded ? "button" : "submit"}
            onClick={embedded ? handleEmbeddedSubmit : undefined}
            disabled={isPending}
          >
            Save SEO
          </Button>
        </>
      )}
    </>
  );

  if (embedded) {
    return <div className={shellClassName}>{fields}</div>;
  }

  return (
    <form action={upsertSeoMetaAction} className={shellClassName}>
      {fields}
    </form>
  );
}
