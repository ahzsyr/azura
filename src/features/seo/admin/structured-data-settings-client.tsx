"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { SeoStructuredConfig } from "@/features/seo/types";
import { upsertStructuredDataAction } from "@/features/seo/actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SCHEMA_ENTITY_TYPES } from "@/features/seo/platform/schema-pipeline/constants";
import { DEFAULT_SCHEMA_BUILDER_FLAGS } from "@/features/seo/platform/schema-pipeline/registry/feature-flags";

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

const BUILDER_FLAG_LABELS: Record<string, string> = {
  organizationBuilder: "Organization",
  localBusinessBuilder: "Local business",
  websiteBuilder: "WebSite",
  webPageBuilder: "WebPage",
  breadcrumbBuilder: "Breadcrumb",
  faqBuilder: "FAQ",
  imageObjectBuilder: "ImageObject",
  productBuilder: "Product",
  articleBuilder: "Article",
  videoObjectBuilder: "VideoObject",
  reviewBuilder: "Review",
};

function stringifyJson(value: Record<string, unknown> | undefined) {
  return value ? JSON.stringify(value, null, 2) : "";
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
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const initialEntityType = config.entityType ?? "Organization";
  const initialBuilderFlags = {
    ...DEFAULT_SCHEMA_BUILDER_FLAGS,
    ...config.builderFlags,
  };
  const initialOrganizationJson = stringifyJson(config.organization);
  const initialWebsiteJson = stringifyJson(config.website);

  const [entityType, setEntityType] = useState(initialEntityType);
  const [builderFlags, setBuilderFlags] = useState<Record<string, boolean>>(initialBuilderFlags);
  const [organizationJson, setOrganizationJson] = useState(initialOrganizationJson);
  const [websiteJson, setWebsiteJson] = useState(initialWebsiteJson);

  const savedSnapshot = useRef<{
    entityType: string;
    builderFlags: Record<string, boolean>;
    organizationJson: string;
    websiteJson: string;
  }>({
    entityType: initialEntityType,
    builderFlags: { ...initialBuilderFlags },
    organizationJson: initialOrganizationJson,
    websiteJson: initialWebsiteJson,
  });

  const tabParam = embedded ? searchParams.get("section") : searchParams.get("tab");
  const activeTab = useMemo((): StructuredDataTabId => {
    return isValidStructuredDataTab(tabParam) ? tabParam : "settings";
  }, [tabParam]);

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
    setBuilderFlags(snapshot.builderFlags);
    setOrganizationJson(snapshot.organizationJson);
    setWebsiteJson(snapshot.websiteJson);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const formData = new FormData();
      formData.set("entityType", entityType);
      formData.set("builderFlags", JSON.stringify(builderFlags));
      formData.set("organization", organizationJson);
      formData.set("website", websiteJson);
      await upsertStructuredDataAction(formData);
      savedSnapshot.current = {
        entityType,
        builderFlags,
        organizationJson,
        websiteJson,
      };
      markSaved();
    } catch {
      setSaveStatus("error");
    }
  }, [builderFlags, entityType, markSaved, organizationJson, setSaveStatus, websiteJson]);

  const handleCancel = useCallback(() => {
    resetFormState();
    markSaved();
  }, [markSaved, resetFormState]);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel]);

  const markSettingsDirty = useCallback(() => {
    markUnsaved();
  }, [markUnsaved]);

  return (
    <div className={embedded ? "space-y-5" : "max-w-6xl space-y-5"}>
      {!embedded ? (
        <div>
          <Link href="/admin/seo/metadata" className="text-sm text-primary hover:underline">
            ← SEO Dashboard
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-semibold">Structured data</h1>
          <p className="mt-1 text-muted-foreground">
            Schema pipeline settings, manual JSON-LD overrides, and builder feature flags.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Schema pipeline settings and manual JSON-LD overrides for the Structured Data Platform.
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
                <div className="rounded-xl border p-6 space-y-4">
                  <h2 className="font-semibold">Readiness checklist</h2>
                  <p className="text-sm text-muted-foreground">
                    Complete these admin areas before expecting rich results in Google Search.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                      • Company profile &amp; schema entity fields —{" "}
                      <Link href="/admin/company?tab=schema" className="text-primary hover:underline">
                        Company → Schema entity
                      </Link>
                    </li>
                    <li>
                      • Logo and brand —{" "}
                      <Link href="/admin/theme" className="text-primary hover:underline">
                        Theme
                      </Link>
                    </li>
                    <li>
                      • FAQ content —{" "}
                      <Link href="/admin/faqs" className="text-primary hover:underline">
                        FAQs
                      </Link>
                    </li>
                    <li>
                      • Sitemap reviewed &amp; submitted —{" "}
                      <Link href="/admin/seo/sitemap" className="text-primary hover:underline">
                        SEO → Sitemap
                      </Link>
                    </li>
                    <li>
                      • Google Search Console connected —{" "}
                      <Link href="/admin/seo/google" className="text-primary hover:underline">
                        SEO → Google
                      </Link>
                    </li>
                    <li>
                      • Audit &amp; preview —{" "}
                      <Link
                        href="/admin/seo/structured-data?tab=audit"
                        className="text-primary hover:underline"
                      >
                        fix missing fields, run Public HTML audit
                      </Link>
                    </li>
                    <li>• Google Business Profile NAP must match company admin exactly (operational)</li>
                  </ul>
                </div>
              </div>
            );
          }

          if (tab === "pages") {
            return (
              <div className="rounded-xl border p-6 space-y-3">
                <h2 className="font-semibold">Per-page JSON-LD in database</h2>
                {withJsonLd.length > 0 ? (
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {withJsonLd.map((m, i) => (
                      <li key={i}>
                        {m.pageKey ?? m.entityType ?? "entity"} — {m.titleEn}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No per-page JSON-LD overrides stored yet. The pipeline generates schema from site
                    content automatically.
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
              className="space-y-4 rounded-xl border p-6"
            >
              <div className="space-y-2">
                <Label htmlFor="entityType">Schema entity type</Label>
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
              </div>

              <div className="space-y-3">
                <Label>Builder feature flags</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(BUILDER_FLAG_LABELS).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <span className="text-sm">{label}</span>
                      <input
                        type="checkbox"
                        checked={builderFlags[key] ?? true}
                        onChange={(event) => {
                          setBuilderFlags((current) => ({ ...current, [key]: event.target.checked }));
                          markSettingsDirty();
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization schema override (JSON, optional)</Label>
                <Textarea
                  id="organization"
                  name="organization"
                  rows={12}
                  className="font-mono text-xs"
                  value={organizationJson}
                  onChange={(event) => {
                    setOrganizationJson(event.target.value);
                    markSettingsDirty();
                  }}
                  placeholder="Manual override merged after pipeline generation"
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
                />
              </div>
            </form>
          );
        }}
      </AdminSettingsLayout>
    </div>
  );
}
