"use client";

import { useStore } from "@nanostores/react";
import { ChevronDown, Copy, EyeOff, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { FooterSectionType } from "@/features/footer/sections/types";
import { getFooterPlugin } from "@/features/footer/sections/registry";
import { resolveSectionIcon, sectionSummary } from "@/features/footer/sections/section-icons";
import { SectionEditorShell } from "@/features/footer/sections/section-editor-shell";
import {
  $footerWorkspace,
  addFooterColumn,
  duplicateFooterColumn,
  removeFooterColumn,
  reorderFooterColumn,
  updateFooterColumn,
} from "@/features/footer/footer-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AddFooterSectionDialog } from "./add-footer-section-dialog";
import { FooterSectionSortList } from "./footer-section-sort-list";

const COLLAPSE_KEY = "fb-section-collapse";

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveCollapsed(set: Set<string>) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export function FooterSectionsPanel() {
  const workspace = useStore($footerWorkspace);
  const [selectedId, setSelectedId] = useState<string | null>(workspace.columns[0]?.id ?? null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => readCollapsed());

  const desktopCols = workspace.responsive.desktop; // 2 | 3 | 4

  /** Sections matching the current search query. */
  const filteredIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set(workspace.columns.map((c) => c.id));
    return new Set(
      workspace.columns
        .filter((col) => {
          const plugin = getFooterPlugin(col.type);
          const label = plugin?.label ?? col.type;
          return (
            label.toLowerCase().includes(q) ||
            col.type.includes(q) ||
            (col.title ?? "").toLowerCase().includes(q)
          );
        })
        .map((c) => c.id),
    );
  }, [workspace.columns, search]);

  /**
   * Group sections by their effective column slot.
   * Sections with an explicit `columnSlot` go to that slot;
   * others get an inferred slot based on their array index.
   */
  const columnGroups = useMemo(() => {
    const groups: { slot: number; sections: typeof workspace.columns }[] = Array.from(
      { length: desktopCols },
      (_, i) => ({ slot: i + 1, sections: [] }),
    );

    workspace.columns.forEach((col, idx) => {
      const slot = col.columnSlot ?? ((idx % desktopCols) + 1);
      const clamped = Math.max(1, Math.min(slot, desktopCols));
      groups[clamped - 1].sections.push(col);
    });

    return groups;
  }, [workspace.columns, desktopCols]);

  const selected = workspace.columns.find((c) => c.id === selectedId) ?? null;
  const selectedPlugin = selected ? getFooterPlugin(selected.type) : null;

  const toggleCollapsed = (id: string) => {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedIds(next);
    saveCollapsed(next);
  };

  const addSection = (type: FooterSectionType) => {
    const plugin = getFooterPlugin(type);
    if (!plugin) return;
    const col = plugin.createDefault();
    addFooterColumn(col);
    setSelectedId(col.id);
  };

  /** All ids in array order — used by the flat DnD reorder. */
  const allIds = workspace.columns.map((c) => c.id);

  return (
    /* Narrow sections list | wide inspector */
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      {/* ── Left: sections list ───────────────────────── */}
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Sections</p>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add section
          </Button>
        </div>

        {workspace.columns.length > 5 ? (
          <Input
            placeholder="Search sections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        ) : null}

        {workspace.layout === "grid" ? (
          /* Grid mode — show sections grouped by column */
          <div className="space-y-4">
            {columnGroups.map((group) => (
              <div key={group.slot}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {group.slot}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Column {group.slot}
                  </span>
                  <Separator className="flex-1" />
                </div>

                {group.sections.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                    No sections assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.sections
                      .filter((col) => filteredIds.has(col.id))
                      .map((col) => (
                        <SectionListItem
                          key={col.id}
                          col={col}
                          selectedId={selectedId}
                          collapsedIds={collapsedIds}
                          desktopCols={desktopCols}
                          onSelect={setSelectedId}
                          onToggleCollapsed={toggleCollapsed}
                          onAssignSlot={(slot) => updateFooterColumn(col.id, { columnSlot: slot })}
                          onDuplicate={() => duplicateFooterColumn(col.id)}
                          onRemove={() => removeFooterColumn(col.id)}
                        />
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Centered / flat mode — single DnD list */
          <FooterSectionSortList
            ids={allIds}
            onReorder={(from, to) => reorderFooterColumn(from, to)}
          >
            {(id, dragHandle) => {
              const col = workspace.columns.find((c) => c.id === id);
              if (!col || !filteredIds.has(id)) return null;
              return (
                <SectionListItem
                  key={id}
                  col={col}
                  selectedId={selectedId}
                  collapsedIds={collapsedIds}
                  desktopCols={desktopCols}
                  dragHandle={dragHandle}
                  onSelect={setSelectedId}
                  onToggleCollapsed={toggleCollapsed}
                  onAssignSlot={(slot) => updateFooterColumn(col.id, { columnSlot: slot })}
                  onDuplicate={() => duplicateFooterColumn(col.id)}
                  onRemove={() => removeFooterColumn(col.id)}
                />
              );
            }}
          </FooterSectionSortList>
        )}
      </div>

      {/* ── Right: inspector ─────────────────────────── */}
      <Card className="h-fit xl:sticky xl:top-20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {selected
              ? (selected.title || selectedPlugin?.label || "Section") + " — Inspector"
              : "Section inspector"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selected && selectedPlugin ? (
            <SectionEditorShell
              column={selected}
              plugin={selectedPlugin}
              desktopColumns={desktopCols}
              onUpdate={(patch) => updateFooterColumn(selected.id, patch)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select a section to edit its details.</p>
          )}
        </CardContent>
      </Card>

      <AddFooterSectionDialog open={addOpen} onOpenChange={setAddOpen} onSelect={addSection} />
    </div>
  );
}

/* ── Section list item card ─────────────────────────────── */

type SectionListItemProps = {
  col: ReturnType<typeof useStore<typeof $footerWorkspace>>["columns"][number];
  selectedId: string | null;
  collapsedIds: Set<string>;
  desktopCols: number;
  dragHandle?: React.ReactNode;
  onSelect: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onAssignSlot: (slot: 1 | 2 | 3 | 4 | undefined) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

function SectionListItem({
  col,
  selectedId,
  collapsedIds,
  desktopCols,
  dragHandle,
  onSelect,
  onToggleCollapsed,
  onAssignSlot,
  onDuplicate,
  onRemove,
}: SectionListItemProps) {
  const plugin = getFooterPlugin(col.type);
  if (!plugin) return null;
  const Icon = resolveSectionIcon(plugin.icon);
  const expanded = !collapsedIds.has(col.id);
  const isSelected = selectedId === col.id;
  const isHidden = col.hiddenOnMobile && col.hiddenOnTablet;

  return (
    <Card className={cn("transition-colors", isSelected && "ring-1 ring-primary")}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-1.5 space-y-0 p-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => onToggleCollapsed(col.id)}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground",
              !expanded && "-rotate-90",
            )}
          />
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{col.title || plugin.label}</span>
        </button>

        {/* Actions row */}
        <div className="flex items-center gap-0.5">
          {dragHandle}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Duplicate"
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive"
            aria-label="Delete"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => onSelect(col.id)}
          >
            Edit
          </Button>
        </div>
      </CardHeader>

      {expanded ? (
        <CardContent className="border-t px-3 pb-3 pt-2 space-y-2">
          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">{plugin.label}</Badge>
            {col.columnSlot != null && (
              <Badge variant="outline" className="text-xs">Col {col.columnSlot}</Badge>
            )}
            {col.enabled === false && (
              <Badge variant="outline" className="text-xs text-muted-foreground">Off</Badge>
            )}
            {isHidden && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <EyeOff className="h-2.5 w-2.5" /> Hidden
              </Badge>
            )}
            {col.hiddenOnMobile && !isHidden && (
              <Badge variant="outline" className="text-xs">Mobile hidden</Badge>
            )}
            {col.hiddenOnTablet && !isHidden && (
              <Badge variant="outline" className="text-xs">Tablet hidden</Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{sectionSummary(col.type, col)}</p>

          {/* Quick column slot assignment */}
          <div className="flex items-center gap-1 pt-0.5">
            <span className="text-xs text-muted-foreground shrink-0">Col:</span>
            {Array.from({ length: desktopCols }, (_, i) => i + 1).map((slot) => (
              <button
                key={slot}
                type="button"
                title={`Assign to column ${slot}`}
                className={cn(
                  "h-5 min-w-[1.25rem] rounded border px-1 text-[10px] font-medium transition-colors",
                  col.columnSlot === slot
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
                onClick={() =>
                  onAssignSlot(
                    col.columnSlot === slot ? undefined : (slot as 1 | 2 | 3 | 4),
                  )
                }
              >
                {slot}
              </button>
            ))}
            {col.columnSlot != null && (
              <button
                type="button"
                className="h-5 rounded border border-dashed px-1 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => onAssignSlot(undefined)}
              >
                Auto
              </button>
            )}

            {/* Responsive visibility quick toggles */}
            <span className="ml-2 text-xs text-muted-foreground shrink-0">Hide:</span>
            <button
              type="button"
              title={col.hiddenOnTablet ? "Visible on tablet" : "Hidden on tablet"}
              className={cn(
                "h-5 rounded border px-1 text-[10px] font-medium transition-colors",
                col.hiddenOnTablet
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
              onClick={() =>
                updateFooterColumn(col.id, { hiddenOnTablet: !col.hiddenOnTablet || undefined })
              }
            >
              Tab
            </button>
            <button
              type="button"
              title={col.hiddenOnMobile ? "Visible on mobile" : "Hidden on mobile"}
              className={cn(
                "h-5 rounded border px-1 text-[10px] font-medium transition-colors",
                col.hiddenOnMobile
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
              onClick={() =>
                updateFooterColumn(col.id, { hiddenOnMobile: !col.hiddenOnMobile || undefined })
              }
            >
              Mob
            </button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
