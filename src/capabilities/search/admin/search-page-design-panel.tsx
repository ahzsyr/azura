"use client";

import { useMemo, useState, type DragEvent, type KeyboardEvent } from "react";
import type { SearchEntityType } from "@prisma/client";
import { AdminSettingsRibbon } from "@/components/admin/layout/admin-settings-ribbon";
import { SEARCH_ENTITY_TYPES, ENTITY_LABELS } from "@/capabilities/search/constants";
import type { SearchPageDesignSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import {
  SettingsSection,
  ToggleField,
  SelectField,
  TextField,
} from "@/capabilities/search/admin/search-settings-fields";

const APPEARANCE_SUB_TABS = [
  { id: "layout", label: "Page Layout" },
  { id: "results", label: "Search Results" },
  { id: "cards", label: "Result Cards" },
  { id: "copy", label: "Copy" },
] as const;

type AppearanceSubTab = (typeof APPEARANCE_SUB_TABS)[number]["id"];

type Props = {
  page: SearchPageDesignSettings;
  onChange: (page: SearchPageDesignSettings) => void;
};

export function SearchPageDesignPanel({ page, onChange }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<AppearanceSubTab>("layout");

  const patch = <K extends keyof SearchPageDesignSettings>(key: K, value: SearchPageDesignSettings[K]) => {
    onChange({ ...page, [key]: value });
  };

  const patchCardField = (
    key: keyof SearchPageDesignSettings["resultCardFields"],
    value: boolean,
  ) => {
    onChange({
      ...page,
      resultCardFields: { ...page.resultCardFields, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      <AdminSettingsRibbon
        tabs={[...APPEARANCE_SUB_TABS]}
        activeTab={activeSubTab}
        onTabChange={(tab) => setActiveSubTab(tab as AppearanceSubTab)}
        layoutId="search-appearance-sub-tab"
        className="top-0 rounded-lg border"
      />

      {activeSubTab === "layout" ? (
        <SettingsSection
          title="Page layout"
          description="Hero, columns, and optional blocks on the dedicated search results page."
        >
          <SelectField
            label="Hero style"
            value={page.heroStyle}
            onChange={(v) => patch("heroStyle", v as SearchPageDesignSettings["heroStyle"])}
            options={[
              { value: "gradient", label: "Gradient glow" },
              { value: "minimal", label: "Minimal" },
              { value: "banner", label: "Banner image" },
              { value: "none", label: "None" },
            ]}
          />
          {page.heroStyle === "banner" ? (
            <TextField
              label="Banner image URL"
              value={page.bannerImage}
              onChange={(v) => patch("bannerImage", v)}
            />
          ) : null}
          <ToggleField
            label="Show search icon in header"
            checked={page.heroShowIcon}
            onChange={(v) => patch("heroShowIcon", v)}
          />
          <SelectField
            label="Layout"
            value={page.layout}
            onChange={(v) => patch("layout", v as SearchPageDesignSettings["layout"])}
            options={[
              { value: "sidebar-preview", label: "Sidebar + preview pane" },
              { value: "sidebar-only", label: "Sidebar only" },
              { value: "stacked", label: "Stacked (filters in drawer)" },
            ]}
          />
          <SelectField
            label="Sidebar mode"
            value={page.sidebarMode}
            onChange={(v) => patch("sidebarMode", v as SearchPageDesignSettings["sidebarMode"])}
            options={[
              { value: "pinned", label: "Pinned (desktop)" },
              { value: "drawer", label: "Drawer only" },
              { value: "auto", label: "Auto (drawer on mobile)" },
            ]}
          />
          <ToggleField
            label="Preview pane"
            description="Right-side hover preview on large screens."
            checked={page.previewPane}
            onChange={(v) => patch("previewPane", v)}
          />
          <ToggleField
            label="Sticky search bar"
            checked={page.stickySearchBar}
            onChange={(v) => patch("stickySearchBar", v)}
          />
          <SelectField
            label="Max content width"
            value={page.maxContentWidth}
            onChange={(v) => patch("maxContentWidth", v as SearchPageDesignSettings["maxContentWidth"])}
            options={[
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "Extra large" },
              { value: "full", label: "Full width" },
            ]}
          />
        </SettingsSection>
      ) : null}

      {activeSubTab === "results" ? (
        <div className="space-y-6">
          <SearchResultTypeOrderPanel
            page={page}
            onOrderChange={(order) => patch("resultTypeOrder", order)}
            onToggle={(type, enabled) =>
              patch("resultTypes", {
                ...page.resultTypes,
                [type]: { ...page.resultTypes[type], enabled },
              })
            }
          />

          <SettingsSection title="Page elements" description="Toggle optional blocks on the results page.">
            <ToggleField
              label="Save search link"
              checked={page.showSaveSearch}
              onChange={(v) => patch("showSaveSearch", v)}
            />
            <ToggleField
              label="Discovery hub (empty state)"
              checked={page.showDiscoveryHub}
              onChange={(v) => patch("showDiscoveryHub", v)}
            />
            <ToggleField
              label="Related terms"
              checked={page.showRelatedTerms}
              onChange={(v) => patch("showRelatedTerms", v)}
            />
            <ToggleField
              label="Entity type pills"
              checked={page.showEntityPills}
              onChange={(v) => patch("showEntityPills", v)}
            />
            <ToggleField
              label="Section headers"
              checked={page.showSectionHeaders}
              onChange={(v) => patch("showSectionHeaders", v)}
            />
          </SettingsSection>
        </div>
      ) : null}

      {activeSubTab === "cards" ? (
        <SettingsSection title="Result cards" description="Card density and visible fields.">
          <SelectField
            label="Card style"
            value={page.resultCardStyle}
            onChange={(v) => patch("resultCardStyle", v as SearchPageDesignSettings["resultCardStyle"])}
            options={[
              { value: "rich", label: "Rich" },
              { value: "compact", label: "Compact" },
              { value: "minimal", label: "Minimal" },
            ]}
          />
          <ToggleField
            label="Image"
            checked={page.resultCardFields.image}
            onChange={(v) => patchCardField("image", v)}
          />
          <ToggleField
            label="Price"
            checked={page.resultCardFields.price}
            onChange={(v) => patchCardField("price", v)}
          />
          <ToggleField
            label="Rating"
            checked={page.resultCardFields.rating}
            onChange={(v) => patchCardField("rating", v)}
          />
          <ToggleField
            label="Brand"
            checked={page.resultCardFields.brand}
            onChange={(v) => patchCardField("brand", v)}
          />
          <ToggleField
            label="Snippet"
            checked={page.resultCardFields.snippet}
            onChange={(v) => patchCardField("snippet", v)}
          />
          <ToggleField
            label="Entity label"
            checked={page.resultCardFields.entityLabel}
            onChange={(v) => patchCardField("entityLabel", v)}
          />
        </SettingsSection>
      ) : null}

      {activeSubTab === "copy" ? (
        <SettingsSection title="Copy overrides" description="Leave blank to use default localized copy.">
          <TextField label="Title (English)" value={page.title} onChange={(v) => patch("title", v)} />
          <TextField label="Title (Arabic)" value={page.title} onChange={(v) => patch("title", v)} />
          <TextField
            label="Subtitle (English)"
            value={page.subtitle}
            onChange={(v) => patch("subtitle", v)}
          />
          <TextField
            label="Subtitle (Arabic)"
            value={page.subtitle}
            onChange={(v) => patch("subtitle", v)}
          />
        </SettingsSection>
      ) : null}
    </div>
  );
}

function SearchResultTypeOrderPanel({
  page,
  onOrderChange,
  onToggle,
}: {
  page: SearchPageDesignSettings;
  onOrderChange: (order: SearchPageDesignSettings["resultTypeOrder"]) => void;
  onToggle: (type: SearchEntityType, enabled: boolean) => void;
}) {
  const [dragType, setDragType] = useState<SearchEntityType | null>(null);
  const orderedTypes = useMemo(() => {
    const ordered = page.resultTypeOrder.filter((type): type is SearchEntityType =>
      SEARCH_ENTITY_TYPES.includes(type as SearchEntityType),
    );
    for (const type of SEARCH_ENTITY_TYPES) {
      if (!ordered.includes(type)) ordered.push(type);
    }
    return ordered;
  }, [page.resultTypeOrder]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...orderedTypes];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onOrderChange(next);
  };

  const moveType = (from: SearchEntityType, to: SearchEntityType) => {
    if (from === to) return;
    const next = orderedTypes.filter((type) => type !== from);
    const target = next.indexOf(to);
    next.splice(target < 0 ? next.length : target, 0, from);
    onOrderChange(next);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLLIElement>, idx: number) => {
    if ((event.altKey || event.ctrlKey) && event.key === "ArrowUp") {
      event.preventDefault();
      move(idx, -1);
    }
    if ((event.altKey || event.ctrlKey) && event.key === "ArrowDown") {
      event.preventDefault();
      move(idx, 1);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, targetType: SearchEntityType) => {
    event.preventDefault();
    if (dragType) moveType(dragType, targetType);
    setDragType(null);
  };

  return (
    <SettingsSection
      title="Result types"
      description="Choose which result groups appear on the search page and arrange their display order."
    >
      <ol className="divide-y rounded-md border" role="list">
        {orderedTypes.map((type, idx) => {
          const label = ENTITY_LABELS[type]?.en ?? type;
          const enabled = page.resultTypes[type]?.enabled !== false;
          return (
            <li
              key={type}
              draggable
              tabIndex={0}
              onDragStart={() => setDragType(type)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, type)}
              onDragEnd={() => setDragType(null)}
              onKeyDown={(event) => handleRowKeyDown(event, idx)}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5 text-sm"
            >
              <span
                className="cursor-grab select-none rounded border bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
                aria-hidden="true"
              >
                ::
              </span>
              <div className="min-w-0">
                <div className="font-medium">{label}</div>
                <div className="truncate text-xs text-muted-foreground">{type}</div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border"
                  checked={enabled}
                  onChange={(event) => onToggle(type, event.target.checked)}
                />
                Show
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label={`Move ${label} up`}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={idx === orderedTypes.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label={`Move ${label} down`}
                >
                  Down
                </button>
              </div>
              <span className="sr-only">Use Alt+ArrowUp or Alt+ArrowDown to reorder.</span>
            </li>
          );
        })}
      </ol>
    </SettingsSection>
  );
}
