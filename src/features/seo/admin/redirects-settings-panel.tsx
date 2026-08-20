"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, X } from "lucide-react";
import { upsertRedirectAction } from "@/features/seo/actions";
import type { RouteCatalogEntry } from "@/features/seo/admin/route-catalog.types";
import { RedirectDeleteButton } from "@/features/seo/admin/redirect-delete-button";
import { useAdminFormDirtySync } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RedirectRow = {
  id: string;
  fromPath: string;
  toPath: string;
  type: string;
  isActive: boolean;
};

type RedirectsSettingsPanelProps = {
  redirects: RedirectRow[];
  routeCatalog?: RouteCatalogEntry[];
  embedded?: boolean;
};

const SOURCE_LABELS: Record<RouteCatalogEntry["source"], string> = {
  wired: "Wired",
  cms: "CMS",
  content: "Content",
  blog: "Blog",
  faq: "FAQ",
};

export function RedirectsSettingsPanel({
  redirects,
  routeCatalog = [],
  embedded = false,
}: RedirectsSettingsPanelProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [type, setType] = useState<"PERMANENT" | "TEMPORARY">("PERMANENT");
  const [isActive, setIsActive] = useState(true);
  const [catalogFilter, setCatalogFilter] = useState("");
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  useAdminFormDirtySync(formRef);

  const editing = useMemo(
    () => (editingId ? redirects.find((r) => r.id === editingId) ?? null : null),
    [editingId, redirects],
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFromPath("");
    setToPath("");
    setType("PERMANENT");
    setIsActive(true);
  }, []);

  const startEdit = useCallback((row: RedirectRow) => {
    setEditingId(row.id);
    setFromPath(row.fromPath);
    setToPath(row.toPath);
    setType(row.type === "TEMPORARY" ? "TEMPORARY" : "PERMANENT");
    setIsActive(row.isActive);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const prefillFromCatalog = useCallback((path: string) => {
    setEditingId(null);
    setFromPath(path);
    setToPath("");
    setType("PERMANENT");
    setIsActive(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleSave = useCallback(async () => {
    const form = formRef.current;
    if (!form) return false;
    if (!form.reportValidity()) return false;

    setSaveStatus("saving");
    const formData = new FormData(form);
    try {
      await upsertRedirectAction(formData);
      resetForm();
      markSaved();
      router.refresh();
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }, [markSaved, resetForm, router, setSaveStatus]);

  const handleCancel = useCallback(() => {
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    registerPageActions({
      onSave: () => {
        startTransition(() => {
          void handleSave();
        });
      },
      onCancel: handleCancel,
      saveLabel: editing ? "Update redirect" : "Add redirect",
      selfManagedSaveStatus: true,
      canSave: !pending,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel, pending, editing]);

  const filteredCatalog = useMemo(() => {
    const q = catalogFilter.trim().toLowerCase();
    if (!q) return routeCatalog;
    return routeCatalog.filter(
      (entry) =>
        entry.path.toLowerCase().includes(q) ||
        entry.label.toLowerCase().includes(q) ||
        entry.source.toLowerCase().includes(q),
    );
  }, [catalogFilter, routeCatalog]);

  const pathOptions = useMemo(() => routeCatalog.map((e) => e.path), [routeCatalog]);

  return (
    <div className={embedded ? "space-y-8" : "max-w-4xl space-y-8"}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold">Redirect Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse current public routes and manage 301/302 redirect rules.
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Routing system links</h2>
            <p className="text-xs text-muted-foreground">
              Wired marketing, CMS, blog, FAQ, and content paths currently known to the site.
            </p>
          </div>
          <Input
            value={catalogFilter}
            onChange={(e) => setCatalogFilter(e.target.value)}
            placeholder="Filter routes…"
            className="max-w-xs"
            aria-label="Filter route catalog"
          />
        </div>
        <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
          {filteredCatalog.map((entry) => (
            <li
              key={`${entry.source}:${entry.path}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.path}</p>
                <p className="text-xs text-muted-foreground">
                  {SOURCE_LABELS[entry.source]} · {entry.label}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={entry.path} target="_blank" title="Open live URL">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => prefillFromCatalog(entry.path)}
                >
                  Add redirect from…
                </Button>
              </div>
            </li>
          ))}
          {filteredCatalog.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No matching routes.</li>
          ) : null}
        </ul>
      </section>

      <form
        ref={formRef}
        id="redirects-settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(() => {
            void handleSave();
          });
        }}
        className="space-y-4 rounded-lg border p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{editing ? "Edit redirect" : "Add redirect"}</h2>
          {editing ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              <X className="me-1 h-3.5 w-3.5" />
              Cancel edit
            </Button>
          ) : null}
        </div>
        {editingId ? <input type="hidden" name="id" value={editingId} /> : null}
        <div>
          <Label htmlFor="redirect-from">From path</Label>
          <Input
            id="redirect-from"
            name="fromPath"
            list="redirect-path-options"
            placeholder="/en/old-page"
            required
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="redirect-to">To path</Label>
          <Input
            id="redirect-to"
            name="toPath"
            list="redirect-path-options"
            placeholder="/en/pages/new-page"
            required
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
          />
        </div>
        <datalist id="redirect-path-options">
          {pathOptions.map((path) => (
            <option key={path} value={path} />
          ))}
        </datalist>
        <div>
          <Label htmlFor="redirect-type">Type</Label>
          <select
            id="redirect-type"
            name="type"
            className="h-10 w-full rounded-md border px-3"
            value={type}
            onChange={(e) => setType(e.target.value === "TEMPORARY" ? "TEMPORARY" : "PERMANENT")}
          >
            <option value="PERMANENT">301 Permanent</option>
            <option value="TEMPORARY">302 Temporary</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="redirect-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <Label htmlFor="redirect-active" className="font-normal">
            Active
          </Label>
          <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
        </div>
        <Button type="submit" className="lg:hidden" disabled={pending}>
          {pending ? "Saving…" : editing ? "Update redirect" : "Add redirect"}
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Redirect rules</h2>
        <ul className="divide-y rounded-lg border">
          {redirects.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0 text-sm">
                <p>
                  <span className="font-medium">{r.fromPath}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{r.toPath}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.type === "TEMPORARY" ? "302 Temporary" : "301 Permanent"}
                  {r.isActive ? "" : " · Inactive"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(r)}>
                  <Pencil className="me-1 h-3.5 w-3.5" />
                  Edit
                </Button>
                <RedirectDeleteButton id={r.id} />
              </div>
            </li>
          ))}
          {redirects.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No redirects configured.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
