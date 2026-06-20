"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { BrandProfilesEditor } from "@/features/catalog/admin/taxonomy/BrandProfilesEditor";
import {
  syncBrandNamesFromProfiles,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";
import { useAdminUiStore } from "@/stores/admin-ui-store";

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
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (items.some((i) => i.toLowerCase() === key)) {
      setDraft("");
      return;
    }
    onChange(sortItems([...items, v]));
    setDraft("");
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

  const editTitle = label === "Brands" ? "Edit brand" : "Edit tag";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      <ul className="max-h-72 overflow-y-auto rounded-md border divide-y">
        {items.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            No {label.toLowerCase()} yet.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item}
              role="button"
              tabIndex={0}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openRename(item)}
              onKeyDown={(e) => handleRowKeyDown(item, e)}
            >
              <span className="truncate">{item}</span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${item}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openRename(item);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Remove ${item}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(items.filter((x) => x !== item));
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
      <p className="text-xs text-muted-foreground">{items.length} {label.toLowerCase()}</p>

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
  const [tab, setTab] = useState<AdminTaxonomyTabId>("brandProfiles");
  const [brands, setBrands] = useState(initialBrands);
  const [tags, setTags] = useState(initialTags);
  const [brandProfiles, setBrandProfiles] = useState<CatalogBrandProfile[]>(initialBrandProfiles);
  const [savedBrands, setSavedBrands] = useState(initialBrands);
  const [savedTags, setSavedTags] = useState(initialTags);
  const [savedBrandProfiles, setSavedBrandProfiles] =
    useState<CatalogBrandProfile[]>(initialBrandProfiles);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const registerPageActions = useAdminUiStore((s) => s.registerPageActions);
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);

  const updateBrands = useCallback(
    (next: string[]) => {
      markUnsaved();
      setBrands(next);
    },
    [markUnsaved],
  );

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
      setBrands(syncBrandNamesFromProfiles(next));
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
        saveKey("catalogBrands", syncedBrands.length > 0 ? syncedBrands : brands),
        saveKey("catalogTags", tags),
        saveKey("catalogBrandProfiles", brandProfiles),
      ]);
      setBrands(syncedBrands.length > 0 ? syncedBrands : brands);
      setSavedBrands(syncedBrands.length > 0 ? syncedBrands : brands);
      setSavedTags(tags);
      setSavedBrandProfiles(brandProfiles);
      setFeedback("Brands, profiles, and tags saved.");
      markSaved();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaveStatus("error");
      return false;
    }
  }, [brandProfiles, brands, tags, markSaved, saveKey, setSaveStatus]);

  const handleCancel = useCallback(() => {
    setBrands(savedBrands);
    setTags(savedTags);
    setBrandProfiles(savedBrandProfiles);
    setError(null);
    setFeedback(null);
  }, [savedBrands, savedTags, savedBrandProfiles]);

  useEffect(() => {
    registerPageActions({
      onSave: handleSave,
      onCancel: handleCancel,
      selfManagedSaveStatus: true,
    });
    return () => clearPageActions();
  }, [registerPageActions, clearPageActions, handleSave, handleCancel]);

  const syncFromCatalog = async (mode: "merge" | "replace") => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog-taxonomy/sync", {
        ...API,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: initialAdminLocaleCode,
          mode,
          includeCategoriesInTags: true,
        }),
      });
      const json = (await res.json()) as {
        brands?: string[];
        tags?: string[];
        brandProfiles?: CatalogBrandProfile[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      if (json.brands) {
        setBrands(json.brands);
        markUnsaved();
      }
      if (json.brandProfiles) {
        setBrandProfiles(json.brandProfiles);
        markUnsaved();
      }
      if (json.tags) {
        setTags(json.tags);
        markUnsaved();
      }
      setFeedback(
        mode === "merge"
          ? "Merged brands and tags from product catalog."
          : "Replaced brands and tags from product catalog.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncing}
          onClick={() => void syncFromCatalog("merge")}
        >
          {syncing ? "Syncing…" : "Sync from catalog (merge)"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncing}
          onClick={() => {
            if (!window.confirm("Replace all brands and tags with values scanned from products?")) return;
            void syncFromCatalog("replace");
          }}
        >
          Replace from catalog
        </Button>
      </div>

      {feedback && <p className="text-sm text-emerald-600 dark:text-emerald-400">{feedback}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <CatalogAdminShell
        tabs={ADMIN_TAXONOMY_TABS}
        activeTab={tab}
        onTabChange={setTab}
      >
        {(panelTab) => (
          <>
            {panelTab === "brandProfiles" ? (
              <>
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Brand profiles</CardTitle>
                  <CardDescription>
                    Logos, descriptions, and landing URLs for brand showcase blocks. Names sync to the
                    brand filter list on save.
                  </CardDescription>
                </CardHeader>
                <BrandProfilesEditor profiles={brandProfiles} onChange={updateBrandProfiles} />
              </>
            ) : panelTab === "brands" ? (
              <>
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Brand list</CardTitle>
                  <CardDescription>
                    Canonical brands for product autocomplete and storefront filters. Products still store
                    their own brand field.
                  </CardDescription>
                </CardHeader>
                <ListEditor
                  label="Brands"
                  items={brands}
                  onChange={updateBrands}
                  placeholder="Add brand name…"
                />
              </>
            ) : (
              <>
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Tag list</CardTitle>
                  <CardDescription>
                    Canonical tags for product editor suggestions. Sync also imports product categories when
                    enabled.
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
