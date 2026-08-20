"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import type { SeoMeta } from "@prisma/client";
import { upsertSeoMetaAction, suggestAutoFillAction } from "@/features/seo/actions";
import { AutoFillPreviewPanel } from "./autofill-preview-panel";
import type { AutoFillSuggestionResult } from "@/features/seo/platform/types/autofill";
import { isSavedSeoTranslation } from "@/features/seo/cms-page-seo-context";
import { ROBOTS_PRESETS } from "@/features/seo/constants";
import { scoreSeoInput, getCheckById, SEO_TITLE_LENGTH, SEO_DESCRIPTION_LENGTH } from "@/features/seo/scoring/seo-scoring.service";
import { buildSeoFieldState } from "@/features/seo/scoring/seo-field-state";
import type { SeoChangeSet } from "@/features/seo/platform/types/change-set";
import { SeoAnalysisPanel } from "./seo-analysis-panel";
import { SeoFieldHint, checkTone } from "./seo-field-hint";
import { SeoSocialPreview } from "./seo-social-preview";
import { GoogleRichResultPreview } from "./google-rich-result-preview";
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
  focusKeywords: string;
  jsonLd: string;
  canonicalUrl: string;
};

const EMPTY_LOCALE_SLICE: LocaleSeoSlice = {
  title: "",
  description: "",
  ogTitle: "",
  focusKeywords: "",
  jsonLd: "",
  canonicalUrl: "",
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
  contentItemId?: string;
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
  publicPath?: string;
  defaultOgImageUrl?: string;
  entityType?: string;
  entityId?: string;
};

function normalizeOriginForCanonical(previewOrigin?: string): string {
  const raw = previewOrigin?.trim();
  if (!raw) return "";
  if (raw.includes("://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

function buildAutoCanonicalUrl(origin: string, localePrefix: string, publicPath?: string): string {
  if (!origin) return "";
  const path = (publicPath ?? "").trim();
  const cleanPath = path
    ? path.startsWith("/")
      ? path
      : `/${path}`
    : "";
  const localeSegment = localePrefix ? `/${localePrefix}` : "";
  return `${origin}${localeSegment}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
}

function stringifyJsonLd(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function buildInitialByLocale(
  translations: Record<string, string> | undefined,
  locales: PublicLocale[],
  defaultCode: string,
  defaults: {
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
  },
  columnFallbacks?: {
    focusKeywords?: string | null;
    jsonLd?: unknown;
    canonicalUrl?: string | null;
  },
): Record<string, LocaleSeoSlice> {
  const out: Record<string, LocaleSeoSlice> = {};
  const columnKeywords = columnFallbacks?.focusKeywords?.trim() ?? "";
  const columnJsonLd = stringifyJsonLd(columnFallbacks?.jsonLd);
  const columnCanonical = columnFallbacks?.canonicalUrl?.trim() ?? "";
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
    const isDefault = locale.code === defaultCode;
    out[locale.code] = {
      title:
        readLegacyFieldForLocale(translations, "metaTitle", locale.code) ||
        (isDefault ? pageDefaultTitle : ""),
      description:
        readLegacyFieldForLocale(translations, "metaDescription", locale.code) ||
        (isDefault ? pageDefaultDesc : ""),
      ogTitle: readLegacyFieldForLocale(translations, "ogTitle", locale.code) || "",
      focusKeywords:
        readLegacyFieldForLocale(translations, "focusKeywords", locale.code) ||
        (isDefault ? columnKeywords : ""),
      jsonLd:
        readLegacyFieldForLocale(translations, "jsonLd", locale.code) ||
        (isDefault ? columnJsonLd : ""),
      canonicalUrl:
        readLegacyFieldForLocale(translations, "canonicalUrl", locale.code) ||
        (isDefault ? columnCanonical : ""),
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
  contentItemId,
  defaultTitleEn = "",
  defaultTitleAr = "",
  defaultDescEn = "",
  defaultDescAr = "",
  embedded = false,
  useTopBarActions,
  onPublish,
  canPublish,
  previewOrigin,
  publicPath,
  defaultOgImageUrl = "",
  entityType: entityTypeProp,
  entityId: entityIdProp,
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
      },
      {
        focusKeywords: meta?.focusKeywords,
        jsonLd: meta?.jsonLd,
        canonicalUrl: meta?.canonicalUrl,
      },
    )
  );
  const [ogImageUrl, setOgImageUrl] = useState(meta?.ogImageUrl ?? defaultOgImageUrl);
  const [robots, setRobots] = useState(meta?.robots ?? "index, follow");
  const [twitterCard, setTwitterCard] = useState(meta?.twitterCard ?? "summary_large_image");
  const [autoFillResult, setAutoFillResult] = useState<AutoFillSuggestionResult | null>(null);
  const [autoFillPending, startAutoFill] = useTransition();
  const canonicalOrigin = useMemo(() => normalizeOriginForCanonical(previewOrigin), [previewOrigin]);
  const suggestedCanonicalByLocale = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of locales) {
      out[locale.code] = buildAutoCanonicalUrl(canonicalOrigin, locale.urlPrefix, publicPath);
    }
    return out;
  }, [canonicalOrigin, locales, publicPath]);
  const suggestedCanonicalUrl = suggestedCanonicalByLocale[activeLocaleCode] ?? "";

  const resolvedEntityType =
    entityTypeProp ??
    (cmsPageId
      ? "CmsPage"
      : postId
        ? "Post"
        : packageId
          ? "PACKAGE"
          : contentItemId
            ? "ContentItem"
            : pageKey
              ? "pageKey"
              : "");
  const resolvedEntityId =
    entityIdProp ??
    cmsPageId ??
    postId ??
    packageId ??
    contentItemId ??
    pageKey?.split(":").pop() ??
    "";

  const trackDirty = !embedded || Boolean(useTopBarActions);
  const shouldUseTopBar =
    useTopBarActions ??
    (!embedded && Boolean(pageKey || cmsPageId || postId || packageId || contentItemId));
  const activeSlice = byLocale[activeLocaleCode] ?? EMPTY_LOCALE_SLICE;
  const englishSlice = byLocale[defaultCode] ?? byLocale.en ?? EMPTY_LOCALE_SLICE;

  const initialByLocale = useMemo(
    () =>
      buildInitialByLocale(
        translations,
        locales,
        defaultCode,
        {
          titleEn: defaultTitleEn,
          titleAr: defaultTitleAr,
          descEn: defaultDescEn,
          descAr: defaultDescAr,
        },
        {
          focusKeywords: meta?.focusKeywords,
          jsonLd: meta?.jsonLd,
          canonicalUrl: meta?.canonicalUrl,
        },
      ),
    [
      translations,
      locales,
      defaultCode,
      defaultTitleEn,
      defaultTitleAr,
      defaultDescEn,
      defaultDescAr,
      meta?.focusKeywords,
      meta?.jsonLd,
      meta?.canonicalUrl,
    ],
  );

  useEffect(() => {
    setByLocale(initialByLocale);
  }, [initialByLocale]);

  useEffect(() => {
    if (!canonicalOrigin) return;
    setByLocale((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const locale of locales) {
        const current = next[locale.code] ?? EMPTY_LOCALE_SLICE;
        if (current.canonicalUrl.trim()) continue;
        const suggested = suggestedCanonicalByLocale[locale.code];
        if (!suggested) continue;
        next[locale.code] = { ...current, canonicalUrl: suggested };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [canonicalOrigin, locales, suggestedCanonicalByLocale]);

  const patchActive = useCallback(
    (patch: Partial<LocaleSeoSlice>) => {
      if (trackDirty) markUnsaved();
      setByLocale((prev) => {
        const current = prev[activeLocaleCode] ?? EMPTY_LOCALE_SLICE;
        return {
          ...prev,
          [activeLocaleCode]: { ...current, ...patch },
        };
      });
    },
    [activeLocaleCode, trackDirty, markUnsaved],
  );

  const applyAutofillToForm = useCallback(
    (changeSet: SeoChangeSet, selected: ReadonlySet<string>) => {
      for (const field of changeSet.fields) {
        if (!selected.has(field.field) || field.next == null) continue;
        switch (field.field) {
          case "metaTitle":
            patchActive({ title: field.next });
            break;
          case "metaDescription":
            patchActive({ description: field.next });
            break;
          case "ogTitle":
            patchActive({ ogTitle: field.next });
            break;
          case "focusKeywords":
            patchActive({ focusKeywords: field.next });
            break;
          case "canonicalUrl":
            patchActive({ canonicalUrl: field.next });
            break;
          case "robots":
            setRobots(field.next);
            break;
          case "ogImageUrl":
            setOgImageUrl(field.next);
            break;
          case "twitterCard":
            setTwitterCard(field.next);
            break;
          case "jsonLd":
            try {
              const parsed = JSON.parse(field.next);
              patchActive({ jsonLd: JSON.stringify(parsed, null, 2) });
            } catch {
              patchActive({ jsonLd: field.next });
            }
            break;
          default:
            break;
        }
      }

      const metaFields = changeSet.metaFields;
      if (metaFields) {
        if (
          selected.has("focusKeywords") &&
          metaFields.focusKeywords &&
          !changeSet.fields.some((f) => f.field === "focusKeywords")
        ) {
          patchActive({ focusKeywords: metaFields.focusKeywords });
        }
        if (selected.has("canonicalUrl") && metaFields.canonicalUrl && !changeSet.fields.some((f) => f.field === "canonicalUrl")) {
          patchActive({ canonicalUrl: metaFields.canonicalUrl });
        }
        if (selected.has("robots") && metaFields.robots && !changeSet.fields.some((f) => f.field === "robots")) {
          setRobots(metaFields.robots);
        }
        if (selected.has("ogImageUrl") && metaFields.ogImageUrl && !changeSet.fields.some((f) => f.field === "ogImageUrl")) {
          setOgImageUrl(metaFields.ogImageUrl);
        }
        if (selected.has("twitterCard") && metaFields.twitterCard && !changeSet.fields.some((f) => f.field === "twitterCard")) {
          setTwitterCard(metaFields.twitterCard);
        }
        if (selected.has("jsonLd") && metaFields.jsonLd != null && !changeSet.fields.some((f) => f.field === "jsonLd")) {
          patchActive({
            jsonLd:
              typeof metaFields.jsonLd === "string"
                ? metaFields.jsonLd
                : JSON.stringify(metaFields.jsonLd, null, 2),
          });
        }
      }
      if (trackDirty) markUnsaved();
    },
    [patchActive, trackDirty, markUnsaved],
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
    if (contentItemId) fd.set("contentItemId", contentItemId);

    for (const locale of locales) {
      const slice = byLocale[locale.code] ?? EMPTY_LOCALE_SLICE;
      fd.set(getLocalizedFormFieldName("metaTitle", locale.code), slice.title);
      fd.set(getLocalizedFormFieldName("metaDescription", locale.code), slice.description);
      fd.set(getLocalizedFormFieldName("ogTitle", locale.code), slice.ogTitle);
      fd.set(getLocalizedFormFieldName("focusKeywords", locale.code), slice.focusKeywords);
      fd.set(getLocalizedFormFieldName("jsonLd", locale.code), slice.jsonLd);
      fd.set(getLocalizedFormFieldName("canonicalUrl", locale.code), slice.canonicalUrl);
    }

    fd.set("robots", robots);
    fd.set("ogImageUrl", ogImageUrl);
    fd.set("twitterCard", twitterCard);
    return fd;
  }, [
    byLocale,
    locales,
    pageKey,
    cmsPageId,
    postId,
    packageId,
    contentItemId,
    robots,
    ogImageUrl,
    twitterCard,
  ]);

  const handleEmbeddedSubmit = () => {
    startTransition(async () => {
      const result = await upsertSeoMetaAction(buildFormData());
      if (result && result.ok === false) {
        setSaveStatus("error");
      }
    });
  };

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const result = await upsertSeoMetaAction(buildFormData());
      if (result && result.ok === false) {
        setSaveStatus("error");
        return false;
      }
      markSaved();
      if (useTopBarActions) router.refresh();
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, [buildFormData, markSaved, setSaveStatus, useTopBarActions, router]);

  const handlePublishFromTopBar = useCallback(async () => {
    const saved = await handleSave();
    if (!saved) {
      // Ensure the top bar doesn't mark "published" when SEO save failed.
      throw new Error("SEO save failed");
    }
    if (!onPublish) return true;
    return onPublish();
  }, [handleSave, onPublish]);

  const handleCancel = useCallback(() => {
    setByLocale(initialByLocale);
    setOgImageUrl(meta?.ogImageUrl ?? defaultOgImageUrl);
    setRobots(meta?.robots ?? "index, follow");
    setTwitterCard(meta?.twitterCard ?? "summary_large_image");
    markSaved();
  }, [defaultOgImageUrl, initialByLocale, markSaved, meta]);

  useEffect(() => {
    if (!shouldUseTopBar) return;
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      onPublish: onPublish ? handlePublishFromTopBar : undefined,
      canPublish: canPublish ?? Boolean(onPublish),
      selfManagedSaveStatus: true,
    });
    return () => {
      // AnimatePresence keeps SEO mounted during tab exit; parent registrar may
      // already own the top bar — only clear if our handlers are still active.
      const owned = useAdminUiStore.getState().pageActions;
      if (owned.onSave === handleSave || owned.onCancel === handleCancel) {
        clearPageActions();
      }
    };
  }, [
    shouldUseTopBar,
    registerPageActions,
    clearPageActions,
    handleSave,
    handleCancel,
    handlePublishFromTopBar,
    onPublish,
    canPublish,
  ]);

  const fieldName = (name: string): string | undefined => (embedded ? undefined : name);

  const persistedTranslations = savedTranslations ?? translations;

  const enabledLocaleCodes = useMemo(() => locales.map((locale) => locale.code), [locales]);

  const titlesByLocale = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of locales) {
      out[locale.code] = byLocale[locale.code]?.title ?? "";
    }
    return out;
  }, [locales, byLocale]);

  const descriptionsByLocale = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of locales) {
      out[locale.code] = byLocale[locale.code]?.description ?? "";
    }
    return out;
  }, [locales, byLocale]);

  const ogTitlesByLocale = useMemo(() => {
    const out: Record<string, string> = {};
    for (const locale of locales) {
      out[locale.code] = byLocale[locale.code]?.ogTitle ?? "";
    }
    return out;
  }, [locales, byLocale]);

  const titleIsFallback =
    !isSavedSeoTranslation(persistedTranslations, "metaTitle", activeLocaleCode) &&
    Boolean(activeSlice.title.trim());
  const descriptionIsFallback =
    !isSavedSeoTranslation(persistedTranslations, "metaDescription", activeLocaleCode) &&
    Boolean(activeSlice.description.trim());

  const analysis = useMemo(
    () =>
      scoreSeoInput({
        enabledLocales: enabledLocaleCodes,
        titlesByLocale,
        descriptionsByLocale,
        ogTitlesByLocale,
        canonicalUrl: activeSlice.canonicalUrl,
        focusKeywords: activeSlice.focusKeywords,
        ogImageUrl,
        robots,
        jsonLd: activeSlice.jsonLd.trim() ? activeSlice.jsonLd : null,
      }),
    [
      enabledLocaleCodes,
      titlesByLocale,
      descriptionsByLocale,
      ogTitlesByLocale,
      activeSlice.canonicalUrl,
      activeSlice.focusKeywords,
      activeSlice.jsonLd,
      ogImageUrl,
      robots,
    ]
  );

  const titleFieldState = useMemo(
    () =>
      buildSeoFieldState(
        activeSlice.title,
        SEO_TITLE_LENGTH.min,
        SEO_TITLE_LENGTH.max,
        "Missing title",
      ),
    [activeSlice.title],
  );

  const descriptionFieldState = useMemo(
    () =>
      buildSeoFieldState(
        activeSlice.description,
        SEO_DESCRIPTION_LENGTH.min,
        SEO_DESCRIPTION_LENGTH.max,
        "Missing description",
      ),
    [activeSlice.description],
  );

  const titleFeedback = titleFieldState.metrics;
  const descriptionFeedback = descriptionFieldState.metrics;

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
      {!embedded && contentItemId && <input type="hidden" name="contentItemId" value={contentItemId} />}

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
        <div className="flex items-center gap-2">
          {activeTab === "edit" && resolvedEntityId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={autoFillPending}
              onClick={() => {
                startAutoFill(async () => {
                  const result = await suggestAutoFillAction({
                    entityType: cmsPageId
                      ? "CmsPage"
                      : postId
                        ? "Post"
                        : contentItemId
                          ? "ContentItem"
                          : resolvedEntityType || "product",
                    entityId: cmsPageId ?? postId ?? contentItemId ?? resolvedEntityId,
                    locale: activeLocaleCode,
                    pageKey,
                    publicPath,
                    profileId: "balanced",
                    applyMode: "preview",
                  });
                  setAutoFillResult(result);
                });
              }}
            >
              {autoFillPending ? "Generating…" : "Auto-fill"}
            </Button>
          ) : null}
          {activeTab === "edit" ? (
            <p className="text-xs text-muted-foreground">
              {activeLocale.flag} {activeLocale.label}
            </p>
          ) : null}
        </div>
      </div>

      {autoFillResult ? (
        <AutoFillPreviewPanel
          preview={autoFillResult.previewModel}
          changeSet={autoFillResult.changeSet}
          entityType={
            cmsPageId ? "CmsPage" : postId ? "Post" : contentItemId ? "ContentItem" : resolvedEntityType || "product"
          }
          entityId={cmsPageId ?? postId ?? contentItemId ?? resolvedEntityId}
          locale={activeLocaleCode}
          onApplied={(payload) => {
            applyAutofillToForm(payload.changeSet, new Set(payload.selected));
            setAutoFillResult(null);
            router.refresh();
          }}
          onCancel={() => setAutoFillResult(null)}
        />
      ) : null}

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
                <Label>Focus keywords ({activeLocale.label})</Label>
                <Input
                  name={fieldName(getLocalizedFormFieldName("focusKeywords", activeLocaleCode))}
                  value={activeSlice.focusKeywords}
                  onChange={(e) => patchActive({ focusKeywords: e.target.value })}
                  dir={isRtl ? "rtl" : undefined}
                  placeholder="umrah, packages, madinah"
                />
                <SeoFieldHint
                  message={keywordsCheck?.message ?? "Add comma-separated focus keywords"}
                  tone={checkTone(keywordsCheck?.passed ?? false)}
                />
              </div>
              <div className="space-y-2">
                <Label>Canonical URL ({activeLocale.label})</Label>
                <Input
                  name={fieldName(getLocalizedFormFieldName("canonicalUrl", activeLocaleCode))}
                  type="text"
                  inputMode="url"
                  value={activeSlice.canonicalUrl}
                  onChange={(e) => patchActive({ canonicalUrl: e.target.value })}
                  placeholder={suggestedCanonicalUrl || "https://yoursite.com/en/page"}
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
            <GoogleRichResultPreview
              title={previewTitle}
              description={previewDesc}
              url={previewOrigin?.includes("://") ? previewOrigin : `https://${previewOrigin ?? "brt-me.com"}/en`}
              showBrandSimulation={pageKey === "home"}
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
            <Label>JSON-LD (optional) ({activeLocale.label})</Label>
            <Textarea
              name={fieldName(getLocalizedFormFieldName("jsonLd", activeLocaleCode))}
              value={activeSlice.jsonLd}
              onChange={(e) => patchActive({ jsonLd: e.target.value })}
              dir={isRtl ? "rtl" : undefined}
              rows={8}
              className="font-mono text-xs"
              placeholder='{"@context":"https://schema.org","@type":"WebPage",...}'
            />
            <SeoFieldHint
              message={jsonLdCheck?.message ?? "JSON-LD helps rich results"}
              tone={checkTone(jsonLdCheck?.passed ?? false, true)}
            />
            <p className="text-xs text-muted-foreground">
              Valid JSON object or array. Merged into the public canonical schema graph when set (entity-aware @id policy).
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
