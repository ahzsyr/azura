"use client";

import { useMemo, useState } from "react";
import type { HeaderBuilderCatalog, MenuItem } from "@/features/navigation/types";
import { contentItemPublicPath } from "@/features/content/content-admin-paths";
import { CatalogListbox } from "../shared/NavigationItemPicker";
import { OptionButtonGroup } from "../header-builder-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type QuickAddPlacement = "root" | "child";

type Props = {
  catalog: HeaderBuilderCatalog;
  parentItem: MenuItem | null;
  placement: QuickAddPlacement;
  onPlacementChange: (p: QuickAddPlacement) => void;
  onAddPages: (destinations: string[]) => void;
};

type QuickAddOption = {
  value: string;
  label: string;
  subtitle: string;
  /** Encoded destination token passed to onAddPages (e.g. `page|home`, `content|offerings|slug`). */
  destination: string;
};

export function MenuQuickAdd({
  catalog,
  parentItem,
  placement,
  onPlacementChange,
  onAddPages,
}: Props) {
  const [selected, setSelected] = useState<QuickAddOption[]>([]);
  const [activeSlug, setActiveSlug] = useState("");

  const options = useMemo<QuickAddOption[]>(() => [
    ...catalog.pages.map((p) => ({
      value: `page:${p.slug}`,
      label: p.title,
      subtitle: `/${p.slug}`,
      destination: `page|${p.slug}`,
    })),
    ...catalog.collections.map((c) => ({
      value: `collection:${c.slug}`,
      label: c.name,
      subtitle: `/categories/${c.slug}`,
      destination: `collection|${c.slug}`,
    })),
    ...catalog.products.map((p) => ({
      value: `product:${p.slug}`,
      label: p.name,
      subtitle: `/products/${p.slug}`,
      destination: `product|${p.slug}`,
    })),
    ...catalog.brands.map((b) => ({
      value: `brand:${b.slug}`,
      label: b.name,
      subtitle: `/brands/${b.slug}`,
      destination: `brand|${b.slug}`,
    })),
    ...catalog.tags.map((t) => ({
      value: `tag:${t.slug}`,
      label: t.name,
      subtitle: `/tags/${t.slug}`,
      destination: `tag|${t.slug}`,
    })),
    ...catalog.posts.map((p) => ({
      value: `post:${p.slug}`,
      label: p.title,
      subtitle: `/blog/${p.slug}`,
      destination: `post|${p.slug}`,
    })),
    ...Object.entries(catalog.contentByType).flatMap(([contentTypeSlug, records]) => {
      const typeMeta = catalog.contentTypes.find((type) => type.slug === contentTypeSlug);
      return records.map((record) => {
        const path =
          contentItemPublicPath(typeMeta?.routePrefix, contentTypeSlug, record.slug) ??
          `/${typeMeta?.routePrefix ?? contentTypeSlug}/${record.slug}`;
        return {
          value: `content:${contentTypeSlug}:${record.slug}`,
          label: record.name,
          subtitle: path,
          destination: `content|${contentTypeSlug}|${record.slug}`,
        };
      });
    }),
  ], [catalog]);

  const toggleFromList = (value: string) => {
    setActiveSlug(value);
    const option = options.find((entry) => entry.value === value);
    if (!option) return;
    setSelected((prev) => (prev.some((entry) => entry.value === value) ? prev.filter((entry) => entry.value !== value) : [...prev, option]));
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Quick Add</p>
        <p className="text-xs text-muted-foreground">Add multiple pages as root items or children.</p>
      </div>
      <div className="space-y-1">
        <Label>Add to</Label>
        <OptionButtonGroup
          value={placement}
          columns={2}
          options={[
            { value: "root", label: "Root" },
            { value: "child", label: "Child" },
          ]}
          onChange={(v) => onPlacementChange(v as QuickAddPlacement)}
        />
        {placement === "child" ? (
          <p className="text-xs text-muted-foreground">
            {parentItem
              ? `Will add under “${parentItem.label}”.`
              : "No item selected — will add as root instead."}
          </p>
        ) : null}
      </div>
      <CatalogListbox
        id="quick-add-pages"
        options={options}
        value={activeSlug}
        emptyMessage="No pages found. Try another name or slug."
        onChange={toggleFromList}
      />
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.map((option) => (
            <button
              key={option.value}
              type="button"
              className="rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
              onClick={() => setSelected((prev) => prev.filter((entry) => entry.value !== option.value))}
            >
              {option.label} ×
            </button>
          ))}
        </div>
      ) : null}
      <Button
        size="sm"
        className="w-full"
        disabled={selected.length === 0}
        onClick={() => {
          onAddPages(selected.map((entry) => entry.destination));
          setSelected([]);
          setActiveSlug("");
        }}
      >
        Add {selected.length || ""} selected destination{selected.length === 1 ? "" : "s"}
      </Button>
    </div>
  );
}
