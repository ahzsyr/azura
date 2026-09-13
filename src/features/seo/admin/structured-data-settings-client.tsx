"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { SeoStructuredConfig } from "@/features/seo/types";
import type { TypeRepresentation } from "@/features/seo/platform/schema-pipeline/constants";
import { upsertStructuredDataAction } from "@/features/seo/actions";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SCHEMA_ENTITY_TYPES } from "@/features/seo/platform/schema-pipeline/constants";
import { DEFAULT_SCHEMA_BUILDER_FLAGS, type SchemaBuilderFlags } from "@/features/seo/platform/schema-pipeline/registry/feature-flags";
import { listRegisteredBuilders } from "@/features/seo/platform/schema-pipeline/registry/builder-registry";
import { StructuredDataAuditPanel } from "@/features/seo/admin/structured-data-audit-panel";
import type { StructuredDataAuditBundle } from "@/features/seo/quality/schema-graph-audit.types";
import { StructuredDataGoogleInstructions } from "@/features/seo/components/structured-data-google-instructions";
import {
  STRUCTURED_DATA_TABS,
  isValidStructuredDataTab,
  type StructuredDataTabId,
} from "@/features/seo/admin/structured-data-tabs";

type JsonLdRow = {
  pageKey: string | null;
  titleEn: string;
  entityType: string | null;
};

type Props = {
  config: SeoStructuredConfig;
  withJsonLd: JsonLdRow[];
  embedded?: boolean;
  initialAudit?: StructuredDataAuditBundle | null;
  sitemapUrl?: string;
  previewTitle?: string;
  previewDescription?: string;
  previewUrl?: string;
  faviconUrl?: string | null;
  siteName?: string;
  knowledgePanel?: {
    name?: string;
    phone?: string;
    address?: string;
    description?: string;
    logoUrl?: string | null;
    foundingDate?: string;
    socialCount?: number;
  };
  sitelinkCandidates?: Array<{ title: string; description?: string }>;
};

const BUILDER_FLAG_BY_ID: Record<string, keyof typeof DEFAULT_SCHEMA_BUILDER_FLAGS> = {
  organization: "organizationBuilder",
  brand: "brandBuilder",
  website: "websiteBuilder",
  webpage: "webPageBuilder",
  breadcrumb: "breadcrumbBuilder",
  faq: "faqBuilder",
  image: "imageObjectBuilder",
  product: "productBuilder",
  article: "articleBuilder",
  video: "videoObjectBuilder",
  review: "reviewBuilder",
};

const HIDDEN_BUILDERS = new Set(["local-business", "review"]);

function stringifyJson(value: Record<string, unknown> | undefined) {
  return value ? JSON.stringify(value, null, 2) : "";
}

function googleStatusLabel(status?: string): string {
  switch (status) {
    case "supported":
      return "Supported";
    case "supporting":
      return "Supporting";
    case "deprecated":
      return "Deprecated";
    case "conditional":
      return "Conditional";
    default:
      return "Enabled";
  }
}

export function StructuredDataSettingsClient({
  config,
  withJsonLd,
  embedded = false,
  initialAudit = null,
  sitemapUrl,
  previewTitle,
  previewDescription,
  previewUrl,
  faviconUrl,
  siteName,
  knowledgePanel,
  sitelinkCandidates,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const initialEntityType = config.entityType ?? "Organization";
  const initialTypeRepresentation = config.typeRepresentation ?? "most-specific";
  const initialBuilderFlags: SchemaBuilderFlags = {
    ...DEFAULT_SCHEMA_BUILDER_FLAGS,
    ...config.builderFlags,
  };
  const initialOrganizationJson = stringifyJson(config.organization);
  const initialWebsiteJson = stringifyJson(config.website);

  const [entityType, setEntityType] = useState(initialEntityType);
  const [typeRepresentation, setTypeRepresentation] = useState<TypeRepresentation>(initialTypeRepresentation);
  const [builderFlags, setBuilderFlags] = useState<SchemaBuilderFlags>(initialBuilderFlags);
  const [organizationJson, setOrganizationJson] = useState(initialOrganizationJson);
  const [websiteJson, setWebsiteJson] = useState(initialWebsiteJson);
  const [showAdvancedOverrides, setShowAdvancedOverrides] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const savedSnapshot = useRef<{
    entityType: string;
    typeRepresentation: TypeRepresentation;
    builderFlags: SchemaBuilderFlags;
    organizationJson: string;
    websiteJson: string;
  }>({
    entityType: initialEntityType,
    typeRepresentation: initialTypeRepresentation,
    builderFlags: { ...initialBuilderFlags },
    organizationJson: initialOrganizationJson,
    websiteJson: initialWebsiteJson,
  });

  const registeredBuilders = useMemo(() => listRegisteredBuilders(), []);

  const tabParam = embedded ? searchParams.get("section") : searchParams.get("tab");
  const activeTab = useMemo((): StructuredDataTabId => {
    return isValidStructuredDataTab(tabParam) ? tabParam : "settings";
  }, [tabParam]);

  const readinessScore = useMemo(() => {
    if (!initialAudit?.graphAudit.sections.length) return null;
    const items = initialAudit.graphAudit.sections.flatMap((section) => section.items);
    const passed = items.filter((item) =>
      ["provided", "valid", "eligible", "google-controlled"].includes(item.status),
    ).length;
    const warnings = items.filter((item) => item.status === "missing").length;
    const total = items.length || 1;
    return {
      score: Math.round((passed / total) * 100),
      passed,
      warnings,
      total,
    };
  }, [initialAudit]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (embedded) {
        params.set("section", tabId);
      } else {
        params.set("tab", tabId);
      }
      const path = embedded ? "/admin/seo/settings" : "/admin/seo/structured-data";
      router.replace(`${path}?${params.toString()}`, { scroll: false });
    },
    [embedded, router, searchParams],
  );

  const resetFormState = useCallback(() => {
    const snapshot = savedSnapshot.current;
    setEntityType(snapshot.entityType);
    setTypeRepresentation(snapshot.typeRepresentation);
    setBuilderFlags(snapshot.builderFlags);
    setOrganizationJson(snapshot.organizationJson);
    setWebsiteJson(snapshot.websiteJson);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const formData = new FormData();
      formData.set("entityType", entityType);
      formData.set("typeRepresentation", typeRepresentation);
      formData.set("builderFlags", JSON.stringify(builderFlags));
      formData.set("organization", organizationJson);
      formData.set("website", websiteJson);
      await runAdminAction(
        "Saving structured data…",
        () => upsertStructuredDataAction(formData),
        "Structured data saved.",
      );
      savedSnapshot.current = {
        entityType,
        typeRepresentation,
        builderFlags,
        organizationJson,
        websiteJson,
      };
      markSaved();
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Save failed.");
    }
  }, [
    builderFlags,
    entityType,
    markSaved,
    organizationJson,
    setSaveStatus,
    typeRepresentation,
    websiteJson,
  ]);

  const handleCancel = useCallback(() => {
    resetFormState();
    markSaved();
  }, [markSaved, resetFormState]);

  useAdminPageActions({
    ownerKey: "seo-structured-data",
    scope: "settings",
    priority: 0,
    onSave: handleSave,
    onCancel: handleCancel,
    saveStatusMode: "self-managed",
  });

  const markSettingsDirty = useCallback(() => {
    markUnsaved();
  }, [markUnsaved]);

  return (
    <div className={embedded ? "space-y-5" : "max-w-6xl space-y-5"}>
      {!embedded ? (
        <div>
          <Link href="/admin/seo" className="text-sm text-primary hover:underline">
            ← SEO Dashboard
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-semibold">Structured data</h1>
          <p className="mt-1 text-muted-foreground">
            Schema pipeline settings, entity configuration, and validation.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Schema pipeline settings and governance for the Structured Data Platform.
        </p>
      )}

      <AdminSettingsLayout
        tabs={[...STRUCTURED_DATA_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId={embedded ? "structured-data-settings-embedded" : "structured-data-settings-ribbon"}
      >
        {(tab) => {
          if (tab === "readiness") {
            return (
              <div className="space-y-6">
                <StructuredDataGoogleInstructions sitemapUrl={sitemapUrl} />
                {readinessScore ? (
                  <div className="rounded-xl border p-6 space-y-2">
                    <h2 className="font-semibold">Schema implementation readiness</h2>
                    <p className="text-3xl font-semibold">{readinessScore.score} / 100</p>
                    <p className="text-sm text-muted-foreground">
                      {readinessScore.passed} passed · {readinessScore.warnings} missing · not a Google
                      ranking score
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    {
                      title: "Identity",
                      items: [
                        ["Company profile", "/admin/company?tab=schema"],
                        ["Theme / logo", "/admin/theme"],
                        ["Business type", "/admin/seo/structured-data?tab=settings"],
                      ],
                    },
                    {
                      title: "Physical business",
                      items: [
                        ["Company address", "/admin/company?tab=localization"],
                        ["Company contact", "/admin/company?tab=contact"],
                      ],
                    },
                    {
                      title: "Content",
                      items: [
                        ["Products", "/admin/products"],
                        ["FAQs", "/admin/faqs"],
                        ["Articles", "/admin/blog"],
                      ],
                    },
                    {
                      title: "Google Search",
                      items: [
                        ["Sitemap", "/admin/seo/sitemap"],
                        ["Google Search Console", "/admin/seo/google"],
                        ["Audit & preview", "/admin/seo/structured-data?tab=audit"],
                      ],
                    },
                  ].map((section) => (
                    <div key={section.title} className="rounded-xl border p-4 space-y-2">
                      <h3 className="font-semibold text-sm">{section.title}</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {section.items.map(([label, href]) => (
                          <li key={label}>
                            <Link href={href} className="text-primary hover:underline">
                              {label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (tab === "pages") {
            return (
              <div className="rounded-xl border p-6 space-y-4">
                <div>
                  <h2 className="font-semibold">Stored JSON-LD (SeoMeta.jsonLd)</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pipeline-generated JSON-LD is emitted automatically. Stored per-page JSON-LD is merged
                    at build time and may duplicate entities if it overlaps the pipeline graph.
                  </p>
                </div>
                {withJsonLd.length > 0 ? (
                  <>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      Page-level JSON-LD override detected. Review Audit &amp; preview for duplicate
                      Organization, WebPage, or Product nodes.
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {withJsonLd.map((m, i) => (
                        <li key={i}>
                          {m.pageKey ?? m.entityType ?? "entity"} — {m.titleEn}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No per-page JSON-LD overrides stored. The pipeline generates schema from site content
                    automatically.
                  </p>
                )}
              </div>
            );
          }

          if (tab === "audit") {
            return (
              <StructuredDataAuditPanel
                initialAudit={initialAudit}
                sitemapUrl={sitemapUrl}
                previewTitle={previewTitle}
                previewDescription={previewDescription}
                previewUrl={previewUrl}
                faviconUrl={faviconUrl}
                siteName={siteName}
                knowledgePanel={knowledgePanel}
                sitelinkCandidates={sitelinkCandidates}
              />
            );
          }

          return (
            <form
              id="structured-data-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
              className="space-y-6"
            >
              {saveError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                  {saveError}
                </div>
              ) : null}

              <div className="rounded-xl border p-6 space-y-4">
                <h2 className="font-semibold">Canonical business entity</h2>
                <div className="space-y-2">
                  <Label htmlFor="entityType">Business type</Label>
                  <select
                    id="entityType"
                    name="entityType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={entityType}
                    onChange={(event) => {
                      setEntityType(event.target.value);
                      markSettingsDirty();
                    }}
                  >
                    {SCHEMA_ENTITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Most-specific Schema.org type. This is the canonical business entity used throughout the
                    site graph (not a separate LocalBusiness node).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeRepresentation">Type representation</Label>
                  <select
                    id="typeRepresentation"
                    name="typeRepresentation"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={typeRepresentation}
                    onChange={(event) => {
                      setTypeRepresentation(event.target.value as TypeRepresentation);
                      markSettingsDirty();
                    }}
                  >
                    <option value="most-specific">Most-specific single @type (recommended)</option>
                    <option value="explicit-supertypes">Explicit supertypes (Organization + subtype)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Schema builders</h2>
                  <span className="text-xs text-muted-foreground">
                    {Object.values(builderFlags).filter(Boolean).length} enabled
                  </span>
                </div>
                <ul className="space-y-2">
                  {registeredBuilders
                    .filter((builder) => !HIDDEN_BUILDERS.has(builder.id))
                    .map((builder) => {
                      const flagKey = BUILDER_FLAG_BY_ID[builder.id];
                      const enabled = flagKey ? (builderFlags[flagKey] ?? true) : true;
                      const google = builder.google;
                      return (
                        <li
                          key={builder.id}
                          className="flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium capitalize">{builder.id}</p>
                            {google ? (
                              <p className="text-xs text-muted-foreground">
                                {google.feature} · {googleStatusLabel(google.status)}
                                {google.status === "deprecated" ? " · Schema.org only" : ""}
                              </p>
                            ) : null}
                            {google?.why ? (
                              <p className="text-xs text-muted-foreground mt-1">{google.why}</p>
                            ) : null}
                          </div>
                          <label className="flex items-center gap-2 text-sm shrink-0">
                            <span className="text-muted-foreground">
                              {builder.id === "organization" ? "Required" : enabled ? "Enabled" : "Disabled"}
                            </span>
                            {builder.id !== "organization" && flagKey ? (
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(event) => {
                                  setBuilderFlags((current) => ({
                                    ...current,
                                    [flagKey]: event.target.checked,
                                  }));
                                  markSettingsDirty();
                                }}
                              />
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div className="rounded-xl border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold"
                  onClick={() => setShowAdvancedOverrides((value) => !value)}
                >
                  Advanced overrides
                  <span className="text-muted-foreground text-sm">{showAdvancedOverrides ? "▴" : "▾"}</span>
                </button>
                {showAdvancedOverrides ? (
                  <div className="space-y-4 border-t px-6 pb-6 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organization schema override (JSON, optional)</Label>
                      <Textarea
                        id="organization"
                        name="organization"
                        rows={10}
                        className="font-mono text-xs"
                        value={organizationJson}
                        onChange={(event) => {
                          setOrganizationJson(event.target.value);
                          markSettingsDirty();
                        }}
                        placeholder='Merged after pipeline generation. @id must remain #organization. Protected: @id, @type, url.'
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">WebSite schema override (JSON, optional)</Label>
                      <Textarea
                        id="website"
                        name="website"
                        rows={8}
                        className="font-mono text-xs"
                        value={websiteJson}
                        onChange={(event) => {
                          setWebsiteJson(event.target.value);
                          markSettingsDirty();
                        }}
                        placeholder="Additional WebSite properties not generated automatically. Do not use for Google's former sitelinks search box."
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </form>
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}
