"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CatalogTaxonomyAdminProps } from "@/features/catalog/admin/load-catalog-taxonomy-props";

const API: RequestInit = { credentials: "include" };

type TabId = "brands" | "tags";

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

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (items.some((i) => i.toLowerCase() === key)) {
      setDraft("");
      return;
    }
    onChange([...items, v].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
    setDraft("");
  };

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
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">No {label.toLowerCase()} yet.</li>
        ) : (
          items.map((item) => (
            <li key={item} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange(items.filter((x) => x !== item))}
              >
                Remove
              </Button>
            </li>
          ))
        )}
      </ul>
      <p className="text-xs text-muted-foreground">{items.length} {label.toLowerCase()}</p>
    </div>
  );
}

export function CatalogTaxonomyPanel({
  initialBrands,
  initialTags,
  initialAdminLocaleCode,
}: CatalogTaxonomyAdminProps) {
  const [tab, setTab] = useState<TabId>("brands");
  const [brands, setBrands] = useState(initialBrands);
  const [tags, setTags] = useState(initialTags);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveKey = useCallback(
    async (key: "catalogBrands" | "catalogTags", value: string[]) => {
      setBusy(true);
      setError(null);
      try {
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
        setFeedback(`${key === "catalogBrands" ? "Brands" : "Tags"} saved.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setBusy(false);
      }
    },
    [initialAdminLocaleCode],
  );

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
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      if (json.brands) setBrands(json.brands);
      if (json.tags) setTags(json.tags);
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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "brands" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("brands")}
        >
          Brands
        </Button>
        <Button
          type="button"
          variant={tab === "tags" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("tags")}
        >
          Tags
        </Button>
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

      {tab === "brands" ? (
        <Card>
          <CardHeader>
            <CardTitle>Brand list</CardTitle>
            <CardDescription>
              Canonical brands for product autocomplete and storefront filters. Products still store their own brand
              field.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ListEditor
              label="Brands"
              items={brands}
              onChange={setBrands}
              placeholder="Add brand name…"
            />
            <Button type="button" disabled={busy} onClick={() => void saveKey("catalogBrands", brands)}>
              {busy ? "Saving…" : "Save brands"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tag list</CardTitle>
            <CardDescription>
              Canonical tags for product editor suggestions. Sync also imports product categories when enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ListEditor label="Tags" items={tags} onChange={setTags} placeholder="Add tag…" />
            <Button type="button" disabled={busy} onClick={() => void saveKey("catalogTags", tags)}>
              {busy ? "Saving…" : "Save tags"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
