"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createFormFromStarterAction } from "@/features/forms/actions";
import { FORM_STARTERS, type FormStarterId } from "@/features/forms/starters";
import {
  FXS_TEMPLATE_CATALOG,
  getFxsTemplate,
  type FxsTemplateFamily,
} from "@/features/forms/fxs";

const FAMILIES: Array<{ id: FxsTemplateFamily | "starters"; label: string }> = [
  { id: "starters", label: "Core starters" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales" },
  { id: "support", label: "Support" },
  { id: "hr", label: "HR" },
  { id: "customer", label: "Customer" },
  { id: "operations", label: "Operations" },
];

export function NewFormWizardPage() {
  const router = useRouter();
  const [family, setFamily] = useState<(typeof FAMILIES)[number]["id"]>("starters");
  const [starterId, setStarterId] = useState<FormStarterId | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const starter = useMemo(
    () => FORM_STARTERS.find((s) => s.id === starterId) ?? null,
    [starterId],
  );
  const template = useMemo(
    () => (templateId ? getFxsTemplate(templateId) : undefined),
    [templateId],
  );

  const selectStarter = (id: FormStarterId) => {
    const s = FORM_STARTERS.find((x) => x.id === id)!;
    setStarterId(id);
    setTemplateId(null);
    setName(s.name);
    setSlug(s.suggestedSlug);
    setError(null);
  };

  const selectTemplate = (id: string) => {
    const t = getFxsTemplate(id);
    if (!t?.starterId) return;
    setTemplateId(id);
    setStarterId(t.starterId);
    setName(t.name);
    setSlug(t.id);
    setError(null);
  };

  const create = async () => {
    if (!starterId) return;
    setBusy(true);
    setError(null);
    const res = await createFormFromStarterAction({
      starterId,
      name: name.trim() || starter?.name || template?.name || "Untitled Form",
      slug: slug.trim() || starter?.suggestedSlug || template?.id || "untitled-form",
    });
    setBusy(false);
    if (!res.success || !res.data?.id) {
      setError(res.success ? "Create failed" : res.error ?? "Create failed");
      return;
    }
    router.push(`/admin/forms/${res.data.id}`);
  };

  const catalog = FXS_TEMPLATE_CATALOG.filter((t) => t.family === family);

  return (
    <>
      <AdminPageHeader
        title="Create Form"
        description="Pick an FXS template family or a core starter. Every option inherits the Form Experience System."
      />

      {!starterId ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FAMILIES.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={family === f.id ? "default" : "outline"}
                onClick={() => setFamily(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {family === "starters" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FORM_STARTERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/40"
                  onClick={() => selectStarter(s.id)}
                >
                  <p className="font-medium">{s.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {s.category}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/40"
                  onClick={() => selectTemplate(t.id)}
                  disabled={!t.starterId}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{t.name}</p>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {t.experience.theme ?? "modern"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t.experience.layoutMode ?? "default"} layout
                    {t.experience.progressStyle ? ` · ${t.experience.progressStyle}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="max-w-lg space-y-4 p-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {template ? "FXS template" : "Starter"}
            </p>
            <p className="font-medium">{template?.name ?? starter?.name}</p>
            {template ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Theme {template.experience.theme} · Layout {template.experience.layoutMode}
              </p>
            ) : null}
          </div>
          <div>
            <Label>Name</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStarterId(null);
                setTemplateId(null);
              }}
              disabled={busy}
            >
              Back
            </Button>
            <Button type="button" onClick={create} disabled={busy}>
              {busy ? "Creating…" : "Create form"}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
