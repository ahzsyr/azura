"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SeoStructuredConfig } from "@/features/seo/types";
import { upsertStructuredDataAction } from "@/features/seo/actions";
import { useAdminFormDirtySync } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SCHEMA_ENTITY_TYPES } from "@/features/seo/platform/schema-pipeline/constants";
import { DEFAULT_SCHEMA_BUILDER_FLAGS } from "@/features/seo/platform/schema-pipeline/registry/feature-flags";

type JsonLdRow = {
  pageKey: string | null;
  titleEn: string;
  entityType: string | null;
};

type Props = {
  config: SeoStructuredConfig;
  withJsonLd: JsonLdRow[];
  embedded?: boolean;
};

const BUILDER_FLAG_LABELS: Record<string, string> = {
  organizationBuilder: "Organization",
  localBusinessBuilder: "Local business",
  websiteBuilder: "WebSite",
  webPageBuilder: "WebPage",
  breadcrumbBuilder: "Breadcrumb",
  faqBuilder: "FAQ",
  imageObjectBuilder: "ImageObject",
  searchActionBuilder: "SearchAction",
  productBuilder: "Product",
  articleBuilder: "Article",
  videoObjectBuilder: "VideoObject",
  reviewBuilder: "Review",
};

export function StructuredDataSettingsClient({ config, withJsonLd, embedded = false }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const [entityType, setEntityType] = useState(config.entityType ?? "Organization");
  const [builderFlags, setBuilderFlags] = useState<Record<string, boolean>>({
    ...DEFAULT_SCHEMA_BUILDER_FLAGS,
    ...config.builderFlags,
  });

  useAdminFormDirtySync(formRef);

  const handleSave = useCallback(async () => {
    formRef.current?.requestSubmit();
  }, []);

  const handleCancel = useCallback(() => {
    formRef.current?.reset();
  }, []);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel]);

  return (
    <div className={embedded ? "space-y-6" : "max-w-3xl space-y-8"}>
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

      <div className="rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold">Readiness checklist</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Company profile complete — <Link href="/admin/company" className="text-primary hover:underline">/admin/company</Link></li>
          <li>• Logo and brand — <Link href="/admin/theme" className="text-primary hover:underline">/admin/theme</Link></li>
          <li>• FAQ content — <Link href="/admin/faqs" className="text-primary hover:underline">/admin/faqs</Link></li>
          <li>• Google Search Console — <Link href="/admin/seo/google" className="text-primary hover:underline">/admin/seo/google</Link></li>
          <li>• Google Business Profile NAP must match company admin exactly (operational)</li>
        </ul>
      </div>

      <form
        ref={formRef}
        id="structured-data-form"
        action={async (formData) => {
          setSaveStatus("saving");
          try {
            formData.set("entityType", entityType);
            formData.set("builderFlags", JSON.stringify(builderFlags));
            await upsertStructuredDataAction(formData);
            markSaved();
          } catch {
            setSaveStatus("error");
          }
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
            onChange={(event) => setEntityType(event.target.value)}
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
              <label key={key} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  checked={builderFlags[key] ?? true}
                  onChange={(event) =>
                    setBuilderFlags((current) => ({ ...current, [key]: event.target.checked }))
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Organization schema override (JSON, optional)</Label>
          <Textarea
            name="organization"
            rows={12}
            className="font-mono text-xs"
            defaultValue={config.organization ? JSON.stringify(config.organization, null, 2) : ""}
            placeholder="Manual override merged after pipeline generation"
          />
        </div>
        <div className="space-y-2">
          <Label>WebSite schema override (JSON, optional)</Label>
          <Textarea
            name="website"
            rows={8}
            className="font-mono text-xs"
            defaultValue={config.website ? JSON.stringify(config.website, null, 2) : ""}
          />
        </div>
      </form>

      {withJsonLd.length > 0 && (
        <div className="rounded-xl border p-4">
          <h2 className="font-semibold mb-2">Per-page JSON-LD (legacy)</h2>
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
