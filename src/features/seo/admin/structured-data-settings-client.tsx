"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { SeoStructuredConfig } from "@/features/seo/types";
import { upsertStructuredDataAction } from "@/features/seo/actions";
import { useAdminFormDirtySync } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type JsonLdRow = {
  pageKey: string | null;
  titleEn: string;
  entityType: string | null;
};

type Props = {
  config: SeoStructuredConfig;
  withJsonLd: JsonLdRow[];
};

export function StructuredDataSettingsClient({ config, withJsonLd }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

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
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/seo" className="text-sm text-primary hover:underline">
          ← SEO
        </Link>
        <h1 className="font-heading text-3xl font-semibold mt-2">Structured data</h1>
        <p className="text-muted-foreground mt-1">
          Global JSON-LD injected on all pages. Per-page JSON-LD is set in page/post SEO panels.
        </p>
      </div>

      <form
        ref={formRef}
        id="structured-data-form"
        action={async (formData) => {
          setSaveStatus("saving");
          try {
            await upsertStructuredDataAction(formData);
            markSaved();
          } catch {
            setSaveStatus("error");
          }
        }}
        className="space-y-4 rounded-xl border p-6"
      >
        <div className="space-y-2">
          <Label>Organization schema (JSON)</Label>
          <Textarea
            name="organization"
            rows={12}
            className="font-mono text-xs"
            defaultValue={config.organization ? JSON.stringify(config.organization, null, 2) : ""}
            placeholder='{"@context":"https://schema.org","@type":"TravelAgency",...}'
          />
        </div>
        <div className="space-y-2">
          <Label>WebSite schema (JSON, optional)</Label>
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
          <h2 className="font-semibold mb-2">Per-page JSON-LD</h2>
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
