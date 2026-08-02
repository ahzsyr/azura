"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { SeoGlobalConfig } from "@/features/seo/types";
import { upsertSeoGlobalAction } from "@/features/seo/actions";
import { useAdminFormDirtySync } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  config: SeoGlobalConfig;
  siteUrl: string;
  embedded?: boolean;
};

export function RobotsSettingsClient({ config, siteUrl, embedded = false }: Props) {
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
    <div className={embedded ? "space-y-6" : "max-w-2xl space-y-6"}>
      {!embedded ? (
        <div>
          <Link href="/admin/seo/metadata" className="text-sm text-primary hover:underline">
            ← SEO Dashboard
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-semibold">Robots.txt</h1>
          <p className="mt-1 text-muted-foreground">
            Base rules always disallow <code>/admin/</code> and <code>/api/</code>. Add paths below (one per line).
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Base rules always disallow <code>/admin/</code> and <code>/api/</code>. Add paths below (one per line).
        </p>
      )}

      <form
        ref={formRef}
        id="robots-settings-form"
        action={async (formData) => {
          setSaveStatus("saving");
          try {
            await upsertSeoGlobalAction(formData);
            markSaved();
          } catch {
            setSaveStatus("error");
          }
        }}
        className="space-y-4 rounded-xl border p-6"
      >
        <div className="space-y-2">
          <Label>Host (optional)</Label>
          <Input name="host" defaultValue={config.host ?? siteUrl} placeholder={siteUrl} />
        </div>
        <div className="space-y-2">
          <Label>Additional disallow paths</Label>
          <Textarea
            name="additionalDisallow"
            rows={5}
            defaultValue={(config.additionalDisallow ?? []).join("\n")}
            placeholder="/private&#10;/draft"
          />
        </div>
        <div className="space-y-2">
          <Label>Additional allow paths</Label>
          <Textarea
            name="additionalAllow"
            rows={3}
            defaultValue={(config.additionalAllow ?? []).join("\n")}
            placeholder="/public-api"
          />
        </div>
      </form>

      <div className="rounded-lg border bg-muted/40 p-4 text-xs font-mono">
        <p className="text-muted-foreground mb-2">Live preview: GET /robots.txt</p>
        <pre>{`User-agent: *
Allow: /
Disallow: /admin/
Sitemap: ${siteUrl}/sitemap.xml`}</pre>
      </div>
    </div>
  );
}
