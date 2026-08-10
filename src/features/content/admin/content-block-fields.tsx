"use client";

import { useState } from "react";
import type { BlockNode } from "@/types/builder";
import { mergeDisplaySettings, type DisplaySettings } from "@/schemas/content/display-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import {
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";
import type { ContentTypeOption } from "@/types/builder";

const CONTENT_TYPES_FALLBACK: ContentTypeOption[] = [
  { slug: "catalog-items", labelPlural: "Catalog Items", isEnabled: true },
  { slug: "listings", labelPlural: "Listings", isEnabled: true },
  { slug: "offerings", labelPlural: "Offerings", isEnabled: true },
];

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  contentTypeOptions?: ContentTypeOption[];
};

function setDisplaySettings(block: BlockNode, onChange: (b: BlockNode) => void, next: Partial<DisplaySettings>) {
  onChange({
    ...block,
    props: {
      ...block.props,
      displaySettings: {
        ...mergeDisplaySettings(block.props.displaySettings as Partial<DisplaySettings>),
        ...next,
      },
    },
  });
}

function AttributeFilterEditor({
  filters,
  onChange,
}: {
  filters: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const entries = Object.entries(filters);

  const removeFilter = (key: string) => {
    const next = { ...filters };
    delete next[key];
    onChange(next);
  };

  const addFilter = () => {
    const k = newKey.trim();
    const v = newVal.trim();
    if (!k) return;
    onChange({ ...filters, [k]: v });
    setNewKey("");
    setNewVal("");
  };

  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <Input
            className="flex-1 h-8 text-xs"
            value={k}
            onChange={(e) => {
              const next = { ...filters };
              delete next[k];
              next[e.target.value] = v;
              onChange(next);
            }}
          />
          <span className="text-muted-foreground text-xs">=</span>
          <Input
            className="flex-1 h-8 text-xs"
            value={v}
            onChange={(e) => onChange({ ...filters, [k]: e.target.value })}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive"
            onClick={() => removeFilter(k)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          className="flex-1 h-8 text-xs"
          placeholder="key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFilter()}
        />
        <span className="text-muted-foreground text-xs">=</span>
        <Input
          className="flex-1 h-8 text-xs"
          placeholder="value"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFilter()}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-7 w-7"
          onClick={addFilter}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Filter items by attribute key/value pairs (e.g. city = MAKKAH).
      </p>
    </div>
  );
}

function ManualIdsEditor({
  ids,
  onChange,
}: {
  ids: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addId = () => {
    const id = draft.trim();
    if (!id || ids.includes(id)) return;
    onChange([...ids, id]);
    setDraft("");
  };

  const removeId = (id: string) => onChange(ids.filter((x) => x !== id));

  return (
    <div className="space-y-2">
      {ids.map((id, i) => (
        <div key={id} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
          <Input className="flex-1 h-8 text-xs font-mono" value={id} readOnly />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive"
            onClick={() => removeId(id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          className="flex-1 h-8 text-xs font-mono"
          placeholder="Paste item ID…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addId()}
        />
        <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={addId}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Pin specific items by ID. When set, overrides automatic ordering.
      </p>
    </div>
  );
}

export function ContentBlockFields({ block, onChange, contentTypeOptions }: Props) {
  const setProp = (key: string, value: unknown) =>
    onChange({ ...block, props: { ...block.props, [key]: value } });

  const settings = mergeDisplaySettings(block.props.displaySettings as Partial<DisplaySettings>);
  const typeOptions = contentTypeOptions ?? CONTENT_TYPES_FALLBACK;

  const manualIds = (block.props.manualIds as string[] | undefined) ?? [];
  const attributeFilters = (block.props.attributeFilters as Record<string, string> | undefined) ?? {};

  return (
    <div className="space-y-4">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />

      <div className="space-y-2">
        <Label>Content type</Label>
        <select
          className="flex h-9 w-full rounded-md border px-2 text-sm"
          value={(block.props.contentTypeSlug as string) ?? "catalog-items"}
          onChange={(e) => setProp("contentTypeSlug", e.target.value)}
        >
          {typeOptions.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.labelPlural}
            </option>
          ))}
        </select>
      </div>

      <Input
        placeholder="Collection slug (optional)"
        value={(block.props.collectionSlug as string) ?? ""}
        onChange={(e) => setProp("collectionSlug", e.target.value)}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(block.props.featuredOnly)}
          onChange={(e) => setProp("featuredOnly", e.target.checked)}
        />
        Featured only
      </label>

      <Input
        type="number"
        placeholder="Limit"
        value={String((block.props.limit as number) ?? settings.limit)}
        onChange={(e) => setProp("limit", Number(e.target.value))}
      />

      <Input
        placeholder="View all href (optional)"
        value={(block.props.viewAllHref as string) ?? ""}
        onChange={(e) => setProp("viewAllHref", e.target.value)}
      />

      {/* Attribute filters */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Attribute filters</p>
        <AttributeFilterEditor
          filters={attributeFilters}
          onChange={(next) => setProp("attributeFilters", next)}
        />
      </div>

      {/* Manual item picker */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Manual items</p>
        <ManualIdsEditor
          ids={manualIds}
          onChange={(next) => setProp("manualIds", next)}
        />
      </div>

      {/* Display settings */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Display</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.showExcerpt}
            onChange={(e) => setDisplaySettings(block, onChange, { showExcerpt: e.target.checked })}
          />
          Show excerpt
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.showPrice}
            onChange={(e) => setDisplaySettings(block, onChange, { showPrice: e.target.checked })}
          />
          Show price
        </label>
        <div className="space-y-1">
          <Label className="text-xs">Columns</Label>
          <select
            className="flex h-9 w-full rounded-md border px-2 text-sm"
            value={String(settings.columns)}
            onChange={(e) =>
              setDisplaySettings(block, onChange, {
                columns: Number(e.target.value) as 2 | 3 | 4,
              })
            }
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>
    </div>
  );
}
