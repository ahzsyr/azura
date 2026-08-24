"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CatalogTaxonomyAdminProps } from "@/features/catalog/admin/load-catalog-taxonomy-props";
import {
  ADMIN_TAXONOMY_TABS,
  type AdminTaxonomyTabId,
} from "@/features/catalog/admin/catalog-admin-tabs";
import { CatalogAdminShell } from "@/features/catalog/admin/catalog-admin-shell";
import {
  CatalogEmptyState,
  CatalogPageHeader,
  CatalogToolbar,
} from "@/features/catalog/admin/ui";
import { BrandProfilesEditor } from "@/features/catalog/admin/taxonomy/BrandProfilesEditor";
import {
  ensureDefaultBrandMatchRules,
  seedProfilesFromBrandNames,
  syncBrandNamesFromProfiles,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { fetchSiteSettingsPublishStatus, publishShell } from "@/lib/publish-shell.client";

const API: RequestInit = { credentials: "include" };

function sortItems(items: string[]): string[] {
  return [...items].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const add = () => {
    const v = draft.trim();
    if (!v) {
      setAddError(`${label.slice(0, -1)} name is required.`);
      return;
    }
    const key = v.toLowerCase();
    if (items.some((i) => i.toLowerCase() === key)) {
      setAddError("That name already exists.");
      return;
    }
    onChange(sortItems([...items, v]));
    setDraft("");
    setAddError(null);
  };

  const openRename = (item: string) => {
    setEditingItem(item);
    setRenameDraft(item);
    setRenameError(null);
  };

  const closeRename = () => {
    setEditingItem(null);
    setRenameDraft("");
    setRenameError(null);
  };

  const saveRename = () => {
    if (!editingItem) return;
    const v = renameDraft.trim();
    if (!v) {
      setRenameError("Name cannot be empty.");
      return;
    }
    const key = v.toLowerCase();
    if (items.some((i) => i !== editingItem && i.toLowerCase() === key)) {
      setRenameError("That name already exists.");
      return;
    }
    onChange(sortItems(items.map((i) => (i === editingItem ? v : i))));
    closeRename();
  };

  const handleRowKeyDown = (item: string, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRename(item);
    }
  };

  const editTitle = `Edit ${label.slice(0, -1).toLowerCase()}`;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setAddError(null);
          }}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" onClick={add}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      {addError ? <p className="text-sm text-destructive">{addError}</p> : null}
      {items.length === 0 ? (
        <CatalogEmptyState
          title={`No ${label.toLowerCase()} yet`}
          description={`Add ${label.toLowerCase()} for product editor suggestions.`}
        />
      ) : (
        <ul className="max-h-72 overflow-y-auto rounded-xl border border-border/70 divide-y bg-background">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-start"
                onClick={() => openRename(item)}
                onKeyDown={(e) => handleRowKeyDown(item, e)}
              >
                {item}
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${item}`}
                  onClick={() => openRename(item)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Remove ${item}`}
                  onClick={() => onChange(items.filter((x) => x !== item))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {items.length} {label.toLowerCase()}
      </p>

      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && closeRename()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTitle}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(e) => {
              setRenameDraft(e.target.value);
              setRenameError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveRename();
              }
            }}
            autoFocus
          />
          {renameError ? <p className="text-sm text-destructive">{renameError}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeRename}>
              Cancel
            </Button>
            <Button type="button" onClick={saveRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CatalogTaxonomyPanel({
  initialBrands,
  initialTags,
  initialBrandProfiles,
  initialAdminLocaleCode,
}: CatalogTaxonomyAdminProps) {
  const [tab, setTab] = useState<AdminTaxonomyTabId>("brands");
  const [tags, setTags] = useState(initialTags);
  const [brandProfiles, setBrandProfiles] = useState<CatalogBrandProfile[]>(() =>
    seedProfilesFromBrandNames(initialBrandProfiles, initialBrands).map(ensureDefaultBrandMatchRules),
  );
  const [savedTags, setSavedTags] = useState(initialTags);
  const [savedBrandProfiles, setSavedBrandProfiles] = useState<CatalogBrandProfile[]>(() =>
    seedProfilesFromBrandNames(initialBrandProfiles, initialBrands).map(ensureDefaultBrandMatchRules),
  );
  const [busy, setBusy] = useState<"autoCreate" | "sync" | "replace" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const markPublishPending = useAdminUiStore((s) => s.markPublishPending);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const setPublishStatus = useAdminUiStore((s) => s.setPublishStatus);

  const updateTags = useCallback(
    (next: string[]) => {
      markUnsaved();
      setTags(next);
    },
    [markUnsaved],
  );

  const updateBrandProfiles = useCallback(
    (next: CatalogBrandProfile[]) => {
      markUnsaved();
      setBrandProfiles(next);
    },
    [markUnsaved],
  );

  const saveKey = useCallback(
    async (key: "catalogBrands" | "catalogTags" | "catalogBrandProfiles", value: unknown) => {
      const res = await fetch("/api/save-settings", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value,
          locale: initialAdminLocaleCode,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      return key;
    },
    [initialAdminLocaleCode],
  );

  const handleSave = useCallback(async () => {
    setError(null);
    setFeedback(null);
    setSaveStatus("saving");
    try {
      const syncedBrands = syncBrandNamesFromProfiles(brandProfiles);
      await Promise.all([
        saveKey("catalogBrands", syncedBrands),
        saveKey("catalogTags", tags),
        saveKey("catalogBrandProfiles", brandProfiles),
      ]);
      setSavedTags(tags);
      setSavedBrandProfiles(brandProfiles);
      setFeedback("Brands and tags saved.");
      markSaved();
      markPublishPending();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaveStatus("error");
      return false;
    }
  }, [brandProfiles, tags, markSaved, markPublishPending, saveKey, setSaveStatus]);

  const handlePublish = useCallback(async () => {
    setError(null);
    setFeedback(null);
    await publishShell("site-settings", initialAdminLocaleCode);
    setFeedback("Taxonomy published to the live site.");
  }, [initialAdminLocaleCode]);

  useEffect(() => {
    void (async () => {
      try {
        const status = await fetchSiteSettingsPublishStatus(initialAdminLocaleCode);
        setPublishStatus(status.isLive ? "live" : "pending");
      } catch {
        /* ignore */
      }
    })();
  }, [initialAdminLocaleCode, setPublishStatus]);

  const handleCancel = useCallback(() => {
    setTags(savedTags);
    setBrandProfiles(savedBrandProfiles);
    setError(null);
    setFeedback(null);
  }, [savedTags, savedBrandProfiles]);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onPublish: handlePublish,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handlePublish, handleCancel]);

  const runTaxonomyAction = async (
    action: "autoCreate" | "syncProducts",
    mode?: "merge" | "replace",
  ) => {
    const busyKey = action === "syncProducts" ? "sync" : mode === "replace" ? "replace" : "autoCreate";
    setBusy(busyKey);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/catalog-taxonomy/sync", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: initialAdminLocaleCode,
          action,
          mode,
          includeCategoriesInTags: action === "autoCreate",
          brandProfiles,
        }),
      });
      const json = (await res.json()) as {
        brands?: string[];
        tags?: string[];
        brandProfiles?: CatalogBrandProfile[];
        report?: {
          productsScanned: number;
          assigned: number;
          unchanged: number;
          skippedNoMatch: number;
          conflicts: number;
          errors?: string[];
        };
        scanned?: { brands: number; tags: number; categories: number };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      if (json.brandProfiles) {
        setBrandProfiles(json.brandProfiles);
        setSavedBrandProfiles(json.brandProfiles);
      }
      if (json.tags) {
        setTags(json.tags);
        setSavedTags(json.tags);
      }
      markSaved();
      markPublishPending();
      if (action === "syncProducts" && json.report) {
        const r = json.report;
        setFeedback(
          `Synced ${r.assigned} product${r.assigned === 1 ? "" : "s"} to brands (${r.unchanged} already matched, ${r.skippedNoMatch} unmatched${r.conflicts ? `, ${r.conflicts} multi-match` : ""}).`,
        );
        if (r.errors?.length) setError(r.errors.slice(0, 3).join(" "));
      } else {
        const created = json.scanned?.brands ?? json.brandProfiles?.length ?? 0;
        setFeedback(
          mode === "replace"
            ? "Replaced brands from product catalog."
            : `Auto-created missing brands from product catalog (${created} scanned).`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        title="Brands"
        description="Manage catalog brands, matching rules, and product assignment."
        actions={
          <CatalogToolbar>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runTaxonomyAction("autoCreate", "merge")}
            >
              {busy === "autoCreate" ? "Creating…" : "Auto Create"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy !== null}
              onClick={() => void runTaxonomyAction("syncProducts")}
            >
              {busy === "sync" ? "Syncing…" : "Sync"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => {
                if (!window.confirm("Replace all brands with values scanned from products?")) return;
                void runTaxonomyAction("autoCreate", "replace");
              }}
            >
              {busy === "replace" ? "Replacing…" : "Replace from catalog"}
            </Button>
          </CatalogToolbar>
        }
      />

      {feedback && <p className="text-sm text-emerald-600 dark:text-emerald-400">{feedback}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <CatalogAdminShell
        tabs={ADMIN_TAXONOMY_TABS}
        activeTab={tab}
        onTabChange={setTab}
      >
        {(panelTab) => (
          <>
            {panelTab === "brands" ? (
              <>
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Brands</CardTitle>
                  <CardDescription>
                    One record per brand. Add matching rules like categories, then Sync to assign products.
                  </CardDescription>
                </CardHeader>
                <BrandProfilesEditor
                  profiles={brandProfiles}
                  onChange={updateBrandProfiles}
                  locale={initialAdminLocaleCode}
                />
              </>
            ) : (
              <>
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Tag list</CardTitle>
                  <CardDescription>
                    Canonical tags for product editor suggestions. Auto Create also imports product tags and
                    categories.
                  </CardDescription>
                </CardHeader>
                <ListEditor label="Tags" items={tags} onChange={updateTags} placeholder="Add tag…" />
              </>
            )}
          </>
        )}
      </CatalogAdminShell>
    </div>
  );
}
