"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CatalogPageHeader, CatalogSection } from "@/features/catalog/admin/ui";
import {
  DEFAULT_CATEGORY_CREATION_POLICY,
  type CategoryCreationPolicy,
} from "@/features/catalog/navigation/types";
import type {
  CatalogListColumnsDesktop,
  CatalogListColumnsTablet,
  ProductListingLayoutPartial,
  ResolvedProductListingLayout,
} from "@/features/catalog/lib/catalog-layout";

const API: RequestInit = { credentials: "include" };

export function CatalogSettingsPanel({
  initialPolicy = DEFAULT_CATEGORY_CREATION_POLICY,
  initialListingLayout,
  locale = "en-us",
}: {
  initialPolicy?: CategoryCreationPolicy;
  initialListingLayout: ResolvedProductListingLayout;
  locale?: string;
}) {
  const [policy, setPolicy] = useState<CategoryCreationPolicy>(
    initialPolicy === "automatic" ? "manual_only" : initialPolicy,
  );
  const [listColumnsDesktop, setListColumnsDesktop] = useState<CatalogListColumnsDesktop>(
    initialListingLayout.listColumnsDesktop,
  );
  const [listColumnsTablet, setListColumnsTablet] = useState<CatalogListColumnsTablet>(
    initialListingLayout.listColumnsTablet,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (policy === "automatic") {
      setError("Automatic category creation is not available.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const listingValue: ProductListingLayoutPartial = {
        ...initialListingLayout,
        listColumnsDesktop,
        listColumnsTablet,
      };
      const saves = [
        fetch("/api/save-settings", {
          ...API,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            key: "categoryCreationPolicy",
            value: policy,
          }),
        }),
        fetch("/api/save-settings", {
          ...API,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            key: "productListingLayout",
            value: listingValue,
          }),
        }),
      ];
      const results = await Promise.all(saves);
      for (const res of results) {
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Save failed");
      }
      setMessage("Catalog settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        title="Catalog Settings"
        description="Global taxonomy and catalog workspace policies."
        actions={
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <CatalogSection
        title="List view columns"
        description="How many product cards appear side-by-side in list view. Mobile always uses one column (list is the default view on small screens)."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Desktop columns</span>
            <select
              className="w-full rounded-md border bg-background px-3 py-2"
              value={listColumnsDesktop}
              onChange={(e) =>
                setListColumnsDesktop(Number(e.target.value) as CatalogListColumnsDesktop)
              }
            >
              <option value={1}>1 column</option>
              <option value={2}>2 columns</option>
              <option value={3}>3 columns</option>
            </select>
            <span className="block text-xs text-muted-foreground">Screens 1100px and wider</span>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Tablet columns</span>
            <select
              className="w-full rounded-md border bg-background px-3 py-2"
              value={listColumnsTablet}
              onChange={(e) =>
                setListColumnsTablet(Number(e.target.value) as CatalogListColumnsTablet)
              }
            >
              <option value={1}>1 column</option>
              <option value={2}>2 columns</option>
            </select>
            <span className="block text-xs text-muted-foreground">Screens 768px–1099px</span>
          </label>
        </div>
      </CatalogSection>

      <CatalogSection
        title="Category creation policy"
        description="Categories are never auto-created during Sync. Creation always requires an explicit administrator action."
      >
        <fieldset className="space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="policy"
              className="mt-1"
              checked={policy === "manual_only"}
              onChange={() => setPolicy("manual_only")}
            />
            <span>
              <span className="font-medium">Manual only</span>
              <span className="mt-0.5 block text-muted-foreground">
                Default ({DEFAULT_CATEGORY_CREATION_POLICY}). Sync may detect unmatched products but
                never creates categories.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="policy"
              className="mt-1"
              checked={policy === "manual_plus_approved"}
              onChange={() => setPolicy("manual_plus_approved")}
            />
            <span>
              <span className="font-medium">Manual + approved automation</span>
              <span className="mt-0.5 block text-muted-foreground">
                Reserved for a future approved-category workflow. Sync still never auto-creates.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 opacity-50">
            <input type="radio" name="policy" disabled className="mt-1" />
            <span>
              <span className="font-medium">Automatic</span>
              <span className="mt-0.5 block text-muted-foreground">
                Not available. Sync never auto-creates categories.
              </span>
            </span>
          </label>
        </fieldset>
      </CatalogSection>
    </div>
  );
}
