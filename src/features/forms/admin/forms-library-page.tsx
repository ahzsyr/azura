"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormTemplateCategory } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteFormTemplateAction,
  duplicateFormTemplateAction,
  publishFormTemplateSnapshotAction,
} from "@/features/forms/actions";

import { computeFormHealthReport } from "@/features/forms/lib/form-health-score";

type TemplateRow = {
  id: string;
  name: string;
  slug: string;
  category: FormTemplateCategory;
  isPublished: boolean;
  publishedVersion: number | null;
  updatedAt: Date;
  submissionCount: number;
  fieldCount: number;
  hasSteps: boolean;
  hasAutomation: boolean;
  hasWebhook: boolean;
  hasAbTests: boolean;
  schemaDocument?: { bindings: unknown[]; steps?: unknown[]; rules?: unknown[] };
  extensions?: Record<string, unknown>;
  definition?: { fields?: unknown[]; steps?: unknown[]; automationRules?: unknown[]; webhooks?: unknown[]; scoringRules?: unknown[] };
};

const CATEGORY_LABELS: Record<FormTemplateCategory, string> = {
  LEAD: "Lead",
  CONTACT: "Contact",
  MULTI_STEP: "Multi-step",
  GENERAL: "General",
  SURVEY: "Survey",
};

function relativeTime(date: Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
}

export function FormsLibraryPage({ templates }: { templates: TemplateRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FormTemplateCategory | "ALL">("ALL");
  const [status, setStatus] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (category !== "ALL" && t.category !== category) return false;
      if (status === "PUBLISHED" && !t.isPublished) return false;
      if (status === "DRAFT" && t.isPublished) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
    });
  }, [templates, query, category, status]);

  const handleDuplicate = async (id: string) => {
    setBusy(id);
    const res = await duplicateFormTemplateAction(id);
    setBusy(null);
    if (res.success && res.data?.id) router.push(`/admin/forms/${res.data.id}`);
    else router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this form template?")) return;
    setBusy(id);
    await deleteFormTemplateAction(id);
    setBusy(null);
    router.refresh();
  };

  const handlePublish = async (id: string) => {
    setBusy(id);
    await publishFormTemplateSnapshotAction(id);
    setBusy(null);
    router.refresh();
  };

  return (
    <>
      <AdminPageHeader
        title="Form Templates"
        description="Build reusable forms for lead capture, contact, and multi-step flows."
        actions={
          <Button asChild>
            <Link href="/admin/forms/new">New form</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Input
          className="max-w-xs"
          placeholder="Search forms…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {(["ALL", "LEAD", "CONTACT", "MULTI_STEP", "SURVEY", "GENERAL"] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={`text-xs px-2 py-1 rounded border ${category === c ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              onClick={() => setCategory(c)}
            >
              {c === "ALL" ? "All" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <select
          className="border rounded-md h-9 px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="ALL">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
        <div className="ms-auto flex gap-1">
          <button
            type="button"
            className={`text-xs px-2 py-1 rounded border ${view === "cards" ? "bg-muted" : ""}`}
            onClick={() => setView("cards")}
          >
            Cards
          </button>
          <button
            type="button"
            className={`text-xs px-2 py-1 rounded border ${view === "table" ? "bg-muted" : ""}`}
            onClick={() => setView("table")}
          >
            Table
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No templates yet. Create your first form template.
        </Card>
      ) : view === "cards" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/admin/forms/${t.id}`} className="font-medium hover:text-primary">
                    {t.name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">/{t.slug}</p>
                </div>
                <Badge variant={t.isPublished ? "default" : "secondary"}>
                  {t.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{CATEGORY_LABELS[t.category]}</Badge>
                {t.hasSteps && <Badge variant="outline">Multi-step</Badge>}
                {t.hasAbTests && <Badge variant="outline">A/B</Badge>}
                {t.hasAutomation && <Badge variant="outline">Automation</Badge>}
                {t.hasWebhook && <Badge variant="outline">Webhook</Badge>}
                <Badge variant="secondary">
                  Health{" "}
                  {computeFormHealthReport(
                    (t.schemaDocument as Parameters<typeof computeFormHealthReport>[0]) ?? {
                      definitionVersion: 2,
                      nodes: [],
                      bindings: [],
                    },
                    (t.extensions as Parameters<typeof computeFormHealthReport>[1]) ?? {},
                  ).overall}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.fieldCount} fields · {t.submissionCount} submissions
                {t.publishedVersion != null ? ` · v${t.publishedVersion}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">Updated {relativeTime(t.updatedAt)}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/forms/${t.id}`}>Edit</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/forms/analytics?templateId=${t.id}`}>Analytics</Link>
                </Button>
                <Button variant="outline" size="sm" disabled={busy === t.id} onClick={() => handleDuplicate(t.id)}>
                  Duplicate
                </Button>
                {!t.isPublished && (
                  <Button variant="outline" size="sm" disabled={busy === t.id} onClick={() => handlePublish(t.id)}>
                    Publish
                  </Button>
                )}
                <Button variant="ghost" size="sm" disabled={busy === t.id} onClick={() => handleDelete(t.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Fields</th>
                <th className="p-3">Submissions</th>
                <th className="p-3">Version</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="p-3">
                    <Link href={`/admin/forms/${t.id}`} className="font-medium hover:text-primary">
                      {t.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{CATEGORY_LABELS[t.category]}</div>
                  </td>
                  <td className="p-3">{t.isPublished ? "Published" : "Draft"}</td>
                  <td className="p-3">{t.fieldCount}</td>
                  <td className="p-3">{t.submissionCount}</td>
                  <td className="p-3">{t.publishedVersion != null ? `v${t.publishedVersion}` : "—"}</td>
                  <td className="p-3">{relativeTime(t.updatedAt)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/forms/${t.id}`}>Edit</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/forms/analytics?templateId=${t.id}`}>Analytics</Link>
                      </Button>
                      <Button variant="outline" size="sm" disabled={busy === t.id} onClick={() => handleDuplicate(t.id)}>
                        Duplicate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
