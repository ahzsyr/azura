"use client";

import { useMemo, useState } from "react";
import type { HeaderBuilderCatalog, MenuItem } from "@/features/navigation/types";
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
  onAddPages: (slugs: string[]) => void;
};

export function MenuQuickAdd({
  catalog,
  parentItem,
  placement,
  onPlacementChange,
  onAddPages,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [activeSlug, setActiveSlug] = useState("");

  const options = useMemo(
    () =>
      catalog.pages.map((p) => ({
        value: p.slug,
        label: p.title,
        subtitle: `/${p.slug}`,
      })),
    [catalog.pages],
  );

  const toggleFromList = (slug: string) => {
    setActiveSlug(slug);
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
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
          {selected.map((slug) => (
            <button
              key={slug}
              type="button"
              className="rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
              onClick={() => setSelected((prev) => prev.filter((s) => s !== slug))}
            >
              {options.find((o) => o.value === slug)?.label ?? slug} ×
            </button>
          ))}
        </div>
      ) : null}
      <Button
        size="sm"
        className="w-full"
        disabled={selected.length === 0}
        onClick={() => {
          onAddPages(selected);
          setSelected([]);
          setActiveSlug("");
        }}
      >
        Add {selected.length || ""} selected page{selected.length === 1 ? "" : "s"}
      </Button>
    </div>
  );
}
