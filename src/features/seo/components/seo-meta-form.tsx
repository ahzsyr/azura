"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import type { SeoMeta } from "@prisma/client";
import { upsertSeoMetaAction } from "@/features/seo/actions";
import { isSavedSeoTranslation } from "@/features/seo/cms-page-seo-context";
import { ROBOTS_PRESETS } from "@/features/seo/constants";
import { scoreSeoInput, getLengthFieldFeedback, getCheckById, SEO_TITLE_LENGTH, SEO_DESCRIPTION_LENGTH } from "@/features/seo/scoring/seo-scoring.service";
import { SeoAnalysisPanel } from "./seo-analysis-panel";
import { SeoFieldHint, checkTone } from "./seo-field-hint";
import { SeoSocialPreview } from "./seo-social-preview";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { readLegacyFieldForLocale } from "@/features/translation/admin-field-value";
import { getLocalizedFormFieldName } from "@/features/translation/form-field-names";
import type { PublicLocale } from "@/i18n/locale-config";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";
import { cn } from "@/lib/utils";

type LocaleSeoSlice = {
  title: string;
  description: string;
  ogTitle: string;
};

type Props = {
  meta?: SeoMeta | null;
  translations?: Record<string, string>;
  /** Raw pageKey EntityTranslation shape — used to detect unsaved CMS fallbacks. */
  savedTranslations?: Record<string, string>;
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
  /** Register Save/Publish in the admin top bar (e.g. page editor SEO tab). */
  useTopBarActions?: boolean;
  onPublish?: () => boolean | void | Promise<boolean | void>;
  canPublish?: boolean;
  previewOrigin?: string;
};

function buildInitialByLocale(
  translations: Record<string, string> | undefined,
  locales: PublicLocale[],
  defaultCode: string,
  defaults: {
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
  }
): Record<string, LocaleSeoSlice> {
  const out: Record<string, LocaleSeoSlice> = {};
  for (const locale of locales) {
    const pageDefaultTitle =
      locale.code === "en"
        ? defaults.titleEn
        : isArabicLocale(locale.code)
          ? defaults.titleAr
          : "";
    const pageDefaultDesc =
      locale.code === "en"
        ? defaults.descEn
        : isArabicLocale(locale.code)
          ? defaults.descAr
          : "";
    out[locale.code] = {
      title:
        readLegacyFieldForLocale(translations, "metaTitle", locale.code) ||
        (locale.code === defaultCode ? pageDefaultTitle : ""),
      description:
        readLegacyFieldForLocale(translations, "metaDescription", locale.code) ||
        (locale.code === defaultCode ? pageDefaultDesc : ""),
      ogTitle: readLegacyFieldForLocale(translations, "ogTitle", locale.code) || "",
    };
  }
  return out;
}

export function SeoMetaForm({
  meta,
  translations,
  savedTranslations,
  pageKey,
  cmsPageId,
  postId,
  packageId,
  defaultTitleEn = "",
  defaultTitleAr = "",
  defaultDescEn = "",
  defaultDescAr = "",
  embedded = false,
  useTopBarActions,
  onPublish,
  canPublish,
  previewOrigin,
}: Props) {
  const { activeLocaleCode, activeLocale, defaultCode, isRtl, locales } = useAdminEditingLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const [activeTab, setActiveTab] = useState<"edit" | "analysis">("edit");
  const [byLocale, setByLocale] = useState<Record<string, LocaleSeoSlice>>(() =>
    buildInitialByLocale(
      translations,
      locales.length > 0 ? locales : [{ code: "en", urlPrefix: "en", label: "English", htmlLang: "en", dir: "ltr", flag: "🇺🇸", isDefault: true }],
      defaultCode,
      {
        titleEn: defaultTitleEn,
        titleAr: defaultTitleAr,
        descEn: defaultDescEn,
        descAr: defaultDescAr,
      }
    )
  );
  const [ogImageUrl, setOgImageUrl] = useState(meta?.ogImageUrl ?? "");
  const [robots, setRobots] = useState(meta?.robots ?? "index, follow");
  const [focusKeywords, setFocusKeywords] = useState(meta?.focusKeywords ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(meta?.canonicalUrl ?? "");
  const [jsonLdStr, setJsonLdStr] = useState(
    meta?.jsonLd != null ? JSON.stringify(meta.jsonLd, null, 2) : ""
  );
  const [twitterCard, setTwitterCard] = useState(meta?.twitterCard ?? "summary_large_image");

  const trackDirty = !embedded || Boolean(useTopBarActions);
  const shouldUseTopBar =
    useTopBarActions ??
    (!embedded && Boolean(pageKey || cmsPageId || postId || packageId));
  const activeSlice = byLocale[activeLocaleCode] ?? { title: "", description: "", ogTitle: "" };
  const englishSlice = byLocale[defaultCode] ?? byLocale.en ?? { title: "", description: "", ogTitle: "" };

  const initialByLocale = useMemo(
    () =>
      buildInitialByLocale(translations, locales, defaultCode, {
        titleEn: defaultTitleEn,
        titleAr: defaultTitleAr,
        descEn: defaultDescEn,
        descAr: defaultDescAr,
      }),
    [translations, locales, defaultCode, defaultTitleEn, defaultTitleAr, defaultDescEn, defaultDescAr]
  );

  useEffect(() => {
    setByLocale(initialByLocale);
  }, [initialByLocale]);

  const patchActive = useCallback(
    (patch: Partial<LocaleSeoSlice>) => {
      if (trackDirty) markUnsaved();
      setByLocale((prev) => {
        const current = prev[activeLocaleCode] ?? { title: "", description: "", ogTitle: "" };
        return {
          ...prev,
          [activeLocaleCode]: { ...current, ...patch },
        };
      });
    },
    [activeLocaleCode, trackDirty, markUnsaved],
  );

  const touch = useCallback(() => {
    if (trackDirty) markUnsaved();
  }, [trackDirty, markUnsaved]);

  const buildFormData = useCallback(() => {
    const fd = new FormData();
    if (pageKey) fd.set("pageKey", pageKey);
    if (cmsPageId) fd.set("cmsPageId", cmsPageId);
    if (postId) fd.set("postId", postId);
    if (packageId) fd.set("packageId", packageId);

    for (const locale of locales) {
      const slice = byLocale[locale.code] ?? { title: "", description: "", ogTitle: "" };
      fd.set(getLocalizedFormFieldName("metaTitle", locale.code), slice.title);
      fd.set(getLocalizedFormFieldName("metaDescription", locale.code), slice.description);
      fd.set(getLocalizedFormFieldName("ogTitle", locale.code), slice.ogTitle);
    }

    fd.set("focusKeywords", focusKeywords);
    fd.set("canonicalUrl", canonicalUrl);
    fd.set("robots", robots);
    fd.set("ogImageUrl", ogImageUrl);
    fd.set("twitterCard", twitterCard);
    fd.set("jsonLd", jsonLdStr);
    return fd;
  }, [
    byLocale,
    locales,
    pageKey,
    cmsPageId,
    postId,
    packageId,
    focusKeywords,
    canonicalUrl,
    robots,
    ogImageUrl,
    twitterCard,
    jsonLdStr,
  ]);

  const handleEmbeddedSubmit = () => {
    startTransition(async () => {
      await upsertSeoMetaAction(buildFormData());
    });
  };

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await upsertSeoMetaAction(buildFormData());
      markSaved();
      if (useTopBarActions) router.refresh();
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, [buildFormData, markSaved, setSaveStatus, useTopBarActions, router]);

  const handleCancel = useCallback(() => {
    setByLocale(initialByLocale);
    setOgImageUrl(meta?.ogImageUrl ?? "");
    setRobots(meta?.robots ?? "index, follow");
    setFocusKeywords(meta?.focusKeywords ?? "");
    setCanonicalUrl(meta?.canonicalUrl ?? "");
    setJsonLdStr(meta?.jsonLd != null ? JSON.stringify(meta.jsonLd, null, 2) : "");
    setTwitterCard(meta?.twitterCard ?? "summary_large_image");
  }, [initialByLocale, meta]);

  useEffect(() => {
    if (!shouldUseTopBar) {
      clearPageActions();
      return;
    }
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      onPublish,
      canPublish: canPublish ?? Boolean(onPublish),
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [
    shouldUseTopBar,
    registerPageActions,
    clearPageActions,
    handleSave,
    handleCancel,
    onPublish,
    canPublish,
  ]);

  const fieldName = (name: string): string | undefined => (embedded ? undefined : name);

  const persistedTranslations = savedTranslations ?? translations;

  const titleEn = isSavedSeoTranslation(persistedTranslations, "metaTitle", "en")
    ? (byLocale.en?.title ?? "")
    : "";
  const titleAr = isSavedSeoTranslation(persistedTranslations, "metaTitle", "ar")
    ? (byLocale.ar?.title ?? "")
    : "";
  const descriptionEn = isSavedSeoTranslation(persistedTranslations, "metaDescription", "en")
    ? (byLocale.en?.description ?? "")
    : "";
  const descriptionAr = isSavedSeoTranslation(persistedTranslations, "metaDescription", "ar")
    ? (byLocale.ar?.description ?? "")
    : "";
  const ogTitleEn = isSavedSeoTranslation(persistedTranslations, "ogTitle", "en")
    ? (byLocale.en?.ogTitle ?? "")
    : "";
  const ogTitleAr = isSavedSeoTranslation(persistedTranslations, "ogTitle", "ar")
    ? (byLocale.ar?.ogTitle ?? "")
    : "";

  const titleIsFallback =
    !isSavedSeoTranslation(persistedTranslations, "metaTitle", activeLocaleCode) &&
    Boolean(activeSlice.title.trim());
  const descriptionIsFallback =
    !isSavedSeoTranslation(persistedTranslations, "metaDescription", activeLocaleCode) &&
    Boolean(activeSlice.description.trim());

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
      translations,
    ]
  );

  const titleForFeedback = titleIsFallback ? "" : activeSlice.title;
  const descriptionForFeedback = descriptionIsFallback ? "" : activeSlice.description;

  const titleFeedback = useMemo(
    () =>
      getLengthFieldFeedback(
        titleForFeedback,
        SEO_TITLE_LENGTH.min,
        SEO_TITLE_LENGTH.max,
        "Missing title",
      ),
    [titleForFeedback],
  );

  const descriptionFeedback = useMemo(
    () =>
      getLengthFieldFeedback(
        descriptionForFeedback,
        SEO_DESCRIPTION_LENGTH.min,
        SEO_DESCRIPTION_LENGTH.max,
        "Missing description",
      ),
    [descriptionForFeedback],
  );

  const keywordsCheck = getCheckById(analysis, "keywords");
  const canonicalCheck = getCheckById(analysis, "canonical");
  const robotsCheck = getCheckById(analysis, "robots");
  const ogImageCheck = getCheckById(analysis, "og-image");
  const jsonLdCheck = getCheckById(analysis, "jsonld");
  const ogTitlesCheck = getCheckById(analysis, "og-titles");

  const ogTitlePassed = Boolean(activeSlice.ogTitle.trim());
  const ogTitleMessage = ogTitlePassed
    ? "Custom OG title set for this language"
    : (ogTitlesCheck?.message ?? "Custom OG titles improve social click-through");

  const gradeStyles = {
    good: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800",
    fair: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
    poor: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800",
  };

  const previewLocale = activeLocaleCode;
  const previewTitle =
    activeSlice.ogTitle ||
    activeSlice.title ||
    (activeLocaleCode === defaultCode ? defaultTitleEn : "") ||
    englishSlice.title;
  const previewDesc =
    activeSlice.description ||
    (activeLocaleCode === defaultCode ? defaultDescEn : "") ||
    englishSlice.description;

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
          <div
            className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
              gradeStyles[analysis.grade],
            )}
          >
            <span className="font-medium">Page SEO score: {analysis.score}/100</span>
            <span className="capitalize">{analysis.grade}</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Meta title ({activeLocale.label})</Label>
                <Input
                  name={fieldName(getLocalizedFormFieldName("metaTitle", activeLocaleCode))}
                  value={activeSlice.title}
                  onChange={(e) => patchActive({ title: e.target.value })}
                  dir={isRtl ? "rtl" : undefined}
                  required={activeLocaleCode === defaultCode}
                />
                <SeoFieldHint
                  message={titleFeedback.message}
                  tone={titleFeedback.tone}
                  progress={titleFeedback.progress}
                  showCounter
                  max={SEO_TITLE_LENGTH.max}
                  length={titleFeedback.length}
                />
                {titleIsFallback ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Preview from page content — not saved as SEO yet. Click Save to persist.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Meta description ({activeLocale.label})</Label>
                <Textarea
                  name={fieldName(getLocalizedFormFieldName("metaDescription", activeLocaleCode))}
                  value={activeSlice.description}
                  onChange={(e) => patchActive({ description: e.target.value })}
                  rows={3}
                  dir={isRtl ? "rtl" : undefined}
                  required={activeLocaleCode === defaultCode}
                />
                <SeoFieldHint
                  message={descriptionFeedback.message}
                  tone={descriptionFeedback.tone}
                  progress={descriptionFeedback.progress}
                  showCounter
                  max={SEO_DESCRIPTION_LENGTH.max}
                  length={descriptionFeedback.length}
                />
                {descriptionIsFallback ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Preview from page content — not saved as SEO yet. Click Save to persist.
                  </p>
                ) : null}
              </div>
              {activeLocaleCode !== defaultCode && englishSlice.title.trim() ? (
                <p className="text-xs text-muted-foreground">
                  Empty fields on the live site fall back to {defaultCode}.
                </p>
              ) : null}
              <div className="space-y-2">
                <Label>Focus keywords</Label>
                <Input
                  name={fieldName("focusKeywords")}
                  value={focusKeywords}
                  onChange={(e) => {
                    touch();
                    setFocusKeywords(e.target.value);
                  }}
                  placeholder="umrah, packages, madinah"
                />
                <SeoFieldHint
                  message={keywordsCheck?.message ?? "Add comma-separated focus keywords"}
                  tone={checkTone(keywordsCheck?.passed ?? false)}
                />
              </div>
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input
                  name={fieldName("canonicalUrl")}
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => {
                    touch();
                    setCanonicalUrl(e.target.value);
                  }}
                  placeholder="https://yoursite.com/en/page"
                />
                <SeoFieldHint
                  message={canonicalCheck?.message ?? "Optional but recommended for duplicate URLs"}
                  tone={checkTone(canonicalCheck?.passed ?? false, true)}
                />
              </div>
              <div className="space-y-2">
                <Label>Robots</Label>
                <select
                  name={fieldName("robots")}
                  value={robots}
                  onChange={(e) => {
                    touch();
                    setRobots(e.target.value);
                  }}
                  className="w-full border rounded-md h-10 px-3"
                >
                  {ROBOTS_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <SeoFieldHint
                  message={robotsCheck?.message ?? robots}
                  tone={checkTone(robotsCheck?.passed ?? false)}
                />
              </div>
            </div>

            <SeoSocialPreview
              locale={previewLocale}
              title={previewTitle}
              description={previewDesc}
              ogImage={ogImageUrl || undefined}
              previewOrigin={previewOrigin}
            />
          </div>

          <div className="grid gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label>OG title override ({activeLocale.label})</Label>
              <Input
                name={fieldName(getLocalizedFormFieldName("ogTitle", activeLocaleCode))}
                value={activeSlice.ogTitle}
                onChange={(e) => patchActive({ ogTitle: e.target.value })}
                dir={isRtl ? "rtl" : undefined}
              />
              <SeoFieldHint
                message={ogTitleMessage}
                tone={checkTone(ogTitlePassed, true)}
              />
            </div>
            <div className="space-y-2">
              <UrlPrimaryMediaPickerField
                label="OG / social image"
                url={ogImageUrl}
                onChange={(url) => {
                  touch();
                  setOgImageUrl(url);
                }}
              />
              {!embedded ? <input type="hidden" name="ogImageUrl" value={ogImageUrl} readOnly /> : null}
              <SeoFieldHint
                message={ogImageCheck?.message ?? "Add an OG image for richer shares"}
                tone={checkTone(ogImageCheck?.passed ?? false, true)}
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter card</Label>
              <select
                name={fieldName("twitterCard")}
                value={twitterCard}
                onChange={(e) => {
                  touch();
                  setTwitterCard(e.target.value);
                }}
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
              onChange={(e) => {
                touch();
                setJsonLdStr(e.target.value);
              }}
              rows={8}
              className="font-mono text-xs"
              placeholder='{"@context":"https://schema.org","@type":"WebPage",...}'
            />
            <SeoFieldHint
              message={jsonLdCheck?.message ?? "JSON-LD helps rich results"}
              tone={checkTone(jsonLdCheck?.passed ?? false, true)}
            />
            <p className="text-xs text-muted-foreground">
              Valid JSON object or array. Merged on the public page when set.
            </p>
          </div>

          {embedded && !shouldUseTopBar ? (
            <Button type="button" onClick={handleEmbeddedSubmit} disabled={isPending}>
              Save SEO
            </Button>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    return <div className={shellClassName}>{fields}</div>;
  }

  return <div className={shellClassName}>{fields}</div>;
}
