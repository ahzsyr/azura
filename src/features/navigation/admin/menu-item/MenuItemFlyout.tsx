"use client";

import { Plus } from "lucide-react";
import type { MenuItem, MenuLayoutType, MegaMenuIconLayoutConfig } from "@/features/navigation/types";
import {
  assignChildToPanelExclusive,
  assignChildToTabExclusive,
  addNavPanelPair,
  clampMegaColumns,
  ensureV2Panels,
  normalizeIconLayoutColumns,
  removeNavPanelPair,
  type MegaMenuFormState,
} from "@/features/navigation/mega-menu-form";
import { generateId } from "@/features/navigation/menu-engine";
import { DEFAULT_FLYOUT_MENU_TYPE } from "@/features/navigation/resolve-href";
import { FLYOUT_LAYOUT_CARDS, MEGA_PANEL_LAYOUT_OPTIONS } from "../shared/flyout-layout-labels";
import type { MegaMenuPanelLayout } from "@/features/navigation/types";
import { MenuItemIconPreview } from "../shared/MenuItemIconPreview";
import { resolveMenuItemPreviewImage } from "../shared/resolve-menu-item-preview-image";
import { useHeaderBuilderCatalog } from "../HeaderBuilderCatalogContext";
import { HeaderField, HeaderSelect } from "../header-builder-ui";
import { WorkspaceLocalizedField } from "@/features/translation/components/workspace-localized-field";
import {
  makeMegaMenuPanelEntityId,
  makeMegaMenuTabEntityId,
  makeMenuItemEntityId,
} from "@/features/translation/workspace-entity-ids";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  menuKey: string;
  itemId: string | null;
  editingItem: MenuItem | null;
  megaMenuType: MenuLayoutType | "";
  mega: MegaMenuFormState;
  onMegaMenuTypeChange: (v: MenuLayoutType | "") => void;
  onPatchMega: (partial: Partial<MegaMenuFormState>) => void;
  onAddChild?: () => void;
};

export function MenuItemFlyout({
  menuKey,
  itemId,
  editingItem,
  megaMenuType,
  mega,
  onMegaMenuTypeChange,
  onPatchMega,
  onAddChild,
}: Props) {
  const { catalog } = useHeaderBuilderCatalog();
  const effectiveMegaType: MenuLayoutType = megaMenuType || DEFAULT_FLYOUT_MENU_TYPE;
  const childList = editingItem?.children ?? [];
  const hasChildren = childList.length > 0;

  const patchIconLayout = (partial: Partial<MegaMenuIconLayoutConfig>) => {
    onPatchMega({ iconLayout: { ...mega.iconLayout, ...partial } });
  };

  const isV2Layout = effectiveMegaType === "sidebar" || effectiveMegaType === "panel";
  const selectedPanel =
    mega.panels.find((p) => p.id === mega.selectedPanelId) ?? mega.panels[0] ?? null;

  const handleLayoutChange = (value: MenuLayoutType) => {
    if (value === "sidebar" || value === "panel") {
      const next = ensureV2Panels(
        {
          ...mega,
          version: 2,
          navigationEnabled: value === "sidebar",
        },
        value,
      );
      onPatchMega(next);
      onMegaMenuTypeChange(value);
      return;
    }
    onPatchMega({ version: 1 });
    onMegaMenuTypeChange(value);
  };

  const patchSelectedPanel = (partial: Partial<(typeof mega.panels)[number]>) => {
    if (!selectedPanel) return;
    onPatchMega({
      panels: mega.panels.map((p) => (p.id === selectedPanel.id ? { ...p, ...partial } : p)),
    });
  };

  const patchNavLabel = (navId: string, panelId: string, label: string) => {
    onPatchMega({
      navigationItems: mega.navigationItems.map((n) =>
        n.id === navId ? { ...n, label } : n,
      ),
      panels: mega.panels.map((p) => (p.id === panelId ? { ...p, label } : p)),
    });
  };

  const layoutBadge = (layout: MegaMenuPanelLayout) =>
    MEGA_PANEL_LAYOUT_OPTIONS.find((o) => o.value === layout)?.label ?? layout;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Flyout layout (this parent only)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Controls how child links appear on desktop. Icon Layout and other options never affect sibling parents.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FLYOUT_LAYOUT_CARDS.map((card) => {
          const active = effectiveMegaType === card.value;
          return (
            <button
              key={card.value}
              type="button"
              className={cn(
                "rounded-lg border p-2.5 text-start transition-colors",
                active ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/40",
              )}
              onClick={() => handleLayoutChange(card.value)}
            >
              <p className="text-xs font-semibold">{card.label}</p>
              <p className="text-[10px] text-muted-foreground">{card.description}</p>
            </button>
          );
        })}
      </div>

      {isV2Layout ? (
        <div className="space-y-4 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sidebar / Panel (v2)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Surface width</Label>
              <HeaderSelect
                value={mega.surfaceWidth}
                onChange={(v) => onPatchMega({ surfaceWidth: v as MegaMenuFormState["surfaceWidth"] })}
              >
                <option value="auto">Auto</option>
                <option value="container">Container</option>
                <option value="wide">Wide</option>
                <option value="full">Full</option>
              </HeaderSelect>
            </div>
            <div className="space-y-1">
              <Label>Alignment</Label>
              <HeaderSelect
                value={mega.alignment}
                onChange={(v) => onPatchMega({ alignment: v as MegaMenuFormState["alignment"] })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </HeaderSelect>
            </div>
          </div>

          {effectiveMegaType === "sidebar" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">
                  Navigation sections ({mega.navigationItems.length} · {mega.panels.length} panels)
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onPatchMega(addNavPanelPair(mega))}
                >
                  <Plus className="size-3.5" /> Add section
                </Button>
              </div>
              <div className="space-y-1.5">
                {mega.navigationItems.map((nav) => {
                  const panel = mega.panels.find((p) => p.id === nav.panelId);
                  const isSelected = selectedPanel?.id === nav.panelId;
                  return (
                    <div
                      key={nav.id}
                      className={cn(
                        "rounded-md border",
                        isSelected ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-2.5 py-2 text-start"
                        onClick={() => onPatchMega({ selectedPanelId: nav.panelId })}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {nav.label || panel?.label || "Section"}
                        </span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          {panel ? layoutBadge(panel.layout) : "—"}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {panel?.childIds.length ?? 0} children
                        </span>
                      </button>
                      {isSelected ? (
                        <div className="space-y-2 border-t px-2.5 py-2">
                          <div className="grid grid-cols-[1fr_auto] gap-2">
                            <Input
                              value={nav.label}
                              placeholder="Nav label"
                              onChange={(e) => patchNavLabel(nav.id, nav.panelId, e.target.value)}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => onPatchMega(removeNavPanelPair(mega, nav.panelId))}
                              disabled={mega.navigationItems.length <= 1}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1">
                <Label>Rail width (px)</Label>
                <Input
                  type="number"
                  min={140}
                  max={400}
                  value={mega.navigationWidth}
                  onChange={(e) =>
                    onPatchMega({ navigationWidth: Number(e.target.value) || 220 })
                  }
                />
              </div>
            </div>
          ) : null}

          {selectedPanel ? (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {effectiveMegaType === "sidebar" ? "Panel settings" : "Panel layout"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Panel label</Label>
                  <Input
                    value={selectedPanel.label ?? ""}
                    onChange={(e) => patchSelectedPanel({ label: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Layout</Label>
                  <HeaderSelect
                    value={selectedPanel.layout}
                    onChange={(v) => patchSelectedPanel({ layout: v as MegaMenuPanelLayout })}
                  >
                    {MEGA_PANEL_LAYOUT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </HeaderSelect>
                </div>
                {(selectedPanel.layout === "cards" ||
                  selectedPanel.layout === "featured" ||
                  selectedPanel.layout === "iconGrid" ||
                  selectedPanel.layout === "productGrid") && (
                  <>
                    <div className="space-y-1">
                      <Label>Columns</Label>
                      <HeaderSelect
                        value={String(selectedPanel.columns ?? 4)}
                        onChange={(v) => patchSelectedPanel({ columns: clampMegaColumns(Number(v)) })}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </HeaderSelect>
                    </div>
                    <div className="space-y-1">
                      <Label>Gap</Label>
                      <HeaderSelect
                        value={selectedPanel.gap ?? "md"}
                        onChange={(v) =>
                          patchSelectedPanel({ gap: v as NonNullable<(typeof selectedPanel)["gap"]> })
                        }
                      >
                        <option value="sm">Small</option>
                        <option value="md">Medium</option>
                        <option value="lg">Large</option>
                      </HeaderSelect>
                    </div>
                  </>
                )}
              </div>

              {(selectedPanel.layout === "featured" ||
                selectedPanel.layout === "cards" ||
                selectedPanel.layout === "productGrid") && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPanel.carousel?.enabled === true}
                    onChange={(e) =>
                      patchSelectedPanel({
                        carousel: e.target.checked
                          ? { enabled: true, arrows: true }
                          : undefined,
                      })
                    }
                  />
                  Enable carousel
                </label>
              )}

              {selectedPanel.layout === "mixed" || selectedPanel.layout === "featured" ? (
                <div className="space-y-1">
                  <Label>Featured child</Label>
                  <HeaderSelect
                    value={selectedPanel.featured?.childId ?? ""}
                    onChange={(v) =>
                      patchSelectedPanel({
                        featured: v
                          ? { ...(selectedPanel.featured ?? {}), childId: v }
                          : undefined,
                      })
                    }
                  >
                    <option value="">None</option>
                    {childList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </HeaderSelect>
                </div>
              ) : null}

              {selectedPanel.layout === "columns" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Column groups</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patchSelectedPanel({
                          columnGroups: [
                            ...(selectedPanel.columnGroups ?? []),
                            {
                              id: generateId(),
                              heading: `Column ${(selectedPanel.columnGroups?.length ?? 0) + 1}`,
                              childIds: [],
                            },
                          ],
                        })
                      }
                    >
                      Add column
                    </Button>
                  </div>
                  {(selectedPanel.columnGroups ?? []).map((group, gIdx) => (
                    <div key={group.id} className="rounded border p-2 space-y-2">
                      <Input
                        value={group.heading}
                        onChange={(e) => {
                          const columnGroups = (selectedPanel.columnGroups ?? []).map((g, i) =>
                            i === gIdx ? { ...g, heading: e.target.value } : g,
                          );
                          patchSelectedPanel({ columnGroups });
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {childList.map((c) => {
                          const checked = group.childIds.includes(c.id);
                          return (
                            <label key={c.id} className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const columnGroups = (selectedPanel.columnGroups ?? []).map(
                                    (g, i) => {
                                      if (i !== gIdx) return g;
                                      return {
                                        ...g,
                                        childIds: e.target.checked
                                          ? [...g.childIds.filter((id) => id !== c.id), c.id]
                                          : g.childIds.filter((id) => id !== c.id),
                                      };
                                    },
                                  );
                                  patchSelectedPanel({ columnGroups });
                                }}
                              />
                              {c.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Assign children (exclusive)</Label>
                  {childList.map((c) => {
                    const checked = selectedPanel.childIds.includes(c.id);
                    return (
                      <div key={c.id} className="rounded border p-2 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              onPatchMega({
                                panels: assignChildToPanelExclusive(
                                  mega.panels,
                                  selectedPanel.id,
                                  c.id,
                                  e.target.checked,
                                ),
                              })
                            }
                          />
                          {c.label}
                        </label>
                        {checked ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-[11px]">Subtitle</Label>
                              <Input
                                value={mega.childDescriptions[c.id] ?? ""}
                                placeholder="Optional subtitle"
                                onChange={(e) =>
                                  onPatchMega({
                                    childDescriptions: {
                                      ...mega.childDescriptions,
                                      [c.id]: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">CTA label</Label>
                              <Input
                                value={mega.childCtaLabels[c.id] ?? ""}
                                placeholder="Learn More"
                                onChange={(e) =>
                                  onPatchMega({
                                    childCtaLabels: {
                                      ...mega.childCtaLabels,
                                      [c.id]: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1 border-t pt-3">
                <Label>Auto-source (optional)</Label>
                <p className="text-[11px] text-muted-foreground">
                  Persist source config only. Empty childIds expand from collection children at render time.
                </p>
                <Input
                  placeholder="Collection slug"
                  value={selectedPanel.source?.collectionId ?? ""}
                  onChange={(e) => {
                    const collectionId = e.target.value.trim();
                    patchSelectedPanel({
                      source: collectionId
                        ? { type: "collectionChildren", collectionId }
                        : undefined,
                    });
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!hasChildren ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          <p>No child items yet.</p>
          {onAddChild ? (
            <Button type="button" size="sm" className="mt-2" onClick={onAddChild}>
              Add child
            </Button>
          ) : null}
        </div>
      ) : null}

      {effectiveMegaType === "icon" ? (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Icon Layout</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Icon size</Label>
              <HeaderSelect
                value={mega.iconLayout.iconSize}
                onChange={(v) => patchIconLayout({ iconSize: v as MegaMenuIconLayoutConfig["iconSize"] })}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </HeaderSelect>
            </div>
            <div className="space-y-1">
              <Label>Columns</Label>
              <HeaderSelect
                value={String(mega.iconLayout.columns)}
                onChange={(v) => patchIconLayout({ columns: normalizeIconLayoutColumns(v) })}
              >
                <option value="auto">Auto</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </HeaderSelect>
            </div>
            <div className="space-y-1">
              <Label>Alignment</Label>
              <HeaderSelect
                value={mega.iconLayout.alignment}
                onChange={(v) => patchIconLayout({ alignment: v as MegaMenuIconLayoutConfig["alignment"] })}
              >
                <option value="start">Left</option>
                <option value="center">Center</option>
                <option value="end">Right</option>
              </HeaderSelect>
            </div>
            <div className="space-y-1">
              <Label>Icon position</Label>
              <HeaderSelect
                value={mega.iconLayout.iconPosition}
                onChange={(v) =>
                  patchIconLayout({ iconPosition: v as MegaMenuIconLayoutConfig["iconPosition"] })
                }
              >
                <option value="top">Above label</option>
                <option value="left">Before label</option>
              </HeaderSelect>
            </div>
            <div className="space-y-1">
              <Label>Spacing</Label>
              <HeaderSelect
                value={mega.iconLayout.spacing}
                onChange={(v) => patchIconLayout({ spacing: v as MegaMenuIconLayoutConfig["spacing"] })}
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </HeaderSelect>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mega.iconLayout.showDescriptions}
                onChange={(e) => patchIconLayout({ showDescriptions: e.target.checked })}
              />
              Show descriptions
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mega.iconLayout.showBadges}
                onChange={(e) => patchIconLayout({ showBadges: e.target.checked })}
              />
              Show badges
            </label>
          </div>
          {hasChildren ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <div
                className="mb-icon-layout-preview grid gap-2 rounded-lg border bg-muted/20 p-3"
                style={{
                  gridTemplateColumns:
                    mega.iconLayout.columns === "auto"
                      ? "repeat(auto-fit, minmax(88px, max-content))"
                      : `repeat(${mega.iconLayout.columns}, minmax(88px, max-content))`,
                  justifyContent:
                    mega.iconLayout.alignment === "center"
                      ? "center"
                      : mega.iconLayout.alignment === "end"
                        ? "end"
                        : "start",
                }}
              >
                {childList.slice(0, 8).map((ch) => (
                  <div
                    key={ch.id}
                    className={cn(
                      "flex gap-2 rounded-md border bg-card p-2",
                      mega.iconLayout.iconPosition === "top" ? "flex-col" : "flex-row items-center",
                      mega.iconLayout.alignment === "center" && "items-center text-center",
                      mega.iconLayout.alignment === "end" && "items-end text-end",
                      mega.iconLayout.alignment === "start" && "items-start text-start",
                      mega.iconLayout.iconPosition === "left" &&
                        mega.iconLayout.alignment === "center" &&
                        "justify-center",
                      mega.iconLayout.iconPosition === "left" &&
                        mega.iconLayout.alignment === "end" &&
                        "justify-end",
                    )}
                  >
                    <MenuItemIconPreview
                      icon={ch.icon}
                      imageUrl={resolveMenuItemPreviewImage(ch, catalog)}
                      className="h-5 w-5"
                    />
                    <span className="truncate text-[11px] font-medium">{ch.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {(effectiveMegaType === "grid" ||
        effectiveMegaType === "mixed" ||
        effectiveMegaType === "columns" ||
        effectiveMegaType === "tabbed" ||
        effectiveMegaType === "dropdown") &&
      hasChildren ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <HeaderField label="Width" htmlFor="m-mega-width">
              <HeaderSelect
                id="m-mega-width"
                value={mega.width}
                onChange={(v) => onPatchMega({ width: v as MegaMenuFormState["width"] })}
              >
                <option value="auto">Auto</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
                <option value="full">Full Width</option>
                <option value="custom">Custom</option>
              </HeaderSelect>
            </HeaderField>
            {mega.width === "custom" ? (
              <HeaderField label="Custom Width" htmlFor="m-mega-custom-width">
                <Input
                  id="m-mega-custom-width"
                  type="number"
                  min={1}
                  max={2000}
                  value={mega.customWidth}
                  onChange={(e) => onPatchMega({ customWidth: Number(e.target.value) })}
                />
              </HeaderField>
            ) : null}
            <HeaderField label="Height" htmlFor="m-mega-height">
              <HeaderSelect
                id="m-mega-height"
                value={mega.height}
                onChange={(v) => onPatchMega({ height: v as MegaMenuFormState["height"] })}
              >
                <option value="auto">Auto</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
                <option value="custom">Custom</option>
              </HeaderSelect>
            </HeaderField>
            {mega.height === "custom" ? (
              <HeaderField label="Custom Height" htmlFor="m-mega-custom-height">
                <Input
                  id="m-mega-custom-height"
                  type="number"
                  min={1}
                  max={1200}
                  value={mega.customHeight}
                  onChange={(e) => onPatchMega({ customHeight: Number(e.target.value) })}
                />
              </HeaderField>
            ) : null}
          </div>

          {(effectiveMegaType === "grid" || effectiveMegaType === "tabbed") && (
            <HeaderField label="Grid columns (1–12)" htmlFor="m-grid-cols">
              <Input
                id="m-grid-cols"
                type="number"
                min={1}
                max={12}
                value={mega.gridColumns}
                onChange={(e) => onPatchMega({ gridColumns: clampMegaColumns(Number(e.target.value)) })}
              />
            </HeaderField>
          )}

          {effectiveMegaType === "columns" && (
            <HeaderField label="Columns (1–12)" htmlFor="m-col-count">
              <Input
                id="m-col-count"
                type="number"
                min={1}
                max={12}
                value={mega.columnCount}
                onChange={(e) => onPatchMega({ columnCount: clampMegaColumns(Number(e.target.value)) })}
              />
            </HeaderField>
          )}

          {effectiveMegaType === "mixed" && itemId ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="text-sm font-semibold">Left panel</div>
                <WorkspaceLocalizedField
                  entityType="MegaMenuPanel"
                  entityId={makeMegaMenuPanelEntityId(menuKey, `${itemId}:left`)}
                  field="title"
                  legacyEntity={{ title: mega.mixedLeftTitle }}
                  onDefaultLocaleChange={(mixedLeftTitle) => onPatchMega({ mixedLeftTitle })}
                />
                <WorkspaceLocalizedField
                  entityType="MegaMenuPanel"
                  entityId={makeMegaMenuPanelEntityId(menuKey, `${itemId}:left`)}
                  field="body"
                  legacyEntity={{ body: mega.mixedLeftBody }}
                  multiline
                  rows={2}
                  onDefaultLocaleChange={(mixedLeftBody) => onPatchMega({ mixedLeftBody })}
                />
              </div>
              <div className="space-y-3">
                <div className="text-sm font-semibold">Right panel</div>
                <WorkspaceLocalizedField
                  entityType="MegaMenuPanel"
                  entityId={makeMegaMenuPanelEntityId(menuKey, `${itemId}:right`)}
                  field="title"
                  legacyEntity={{ title: mega.mixedRightTitle }}
                  onDefaultLocaleChange={(mixedRightTitle) => onPatchMega({ mixedRightTitle })}
                />
                <WorkspaceLocalizedField
                  entityType="MegaMenuPanel"
                  entityId={makeMegaMenuPanelEntityId(menuKey, `${itemId}:right`)}
                  field="body"
                  legacyEntity={{ body: mega.mixedRightBody }}
                  multiline
                  rows={2}
                  onDefaultLocaleChange={(mixedRightBody) => onPatchMega({ mixedRightBody })}
                />
              </div>
            </div>
          ) : null}

          {effectiveMegaType === "tabbed" && itemId ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold">Tabs & child assignment</div>
              {mega.tabs.map((tab, tabIdx) => (
                <div key={tab.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <WorkspaceLocalizedField
                        entityType="MegaMenuTab"
                        entityId={makeMegaMenuTabEntityId(menuKey, itemId, tab.id)}
                        field="label"
                        legacyEntity={{ label: tab.label }}
                        onDefaultLocaleChange={(label) => {
                          const tabs = mega.tabs.map((t, i) => (i === tabIdx ? { ...t, label } : t));
                          onPatchMega({ tabs });
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const tabs = mega.tabs.filter((_, i) => i !== tabIdx);
                        onPatchMega({ tabs: tabs.length ? tabs : mega.tabs });
                      }}
                      disabled={mega.tabs.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {childList.map((ch) => (
                      <label key={ch.id} className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={tab.childIds.includes(ch.id)}
                          onChange={(e) => {
                            onPatchMega({
                              tabs: assignChildToTabExclusive(mega.tabs, tabIdx, ch.id, e.target.checked),
                            });
                          }}
                        />
                        {ch.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onPatchMega({
                    tabs: [...mega.tabs, { id: generateId(), label: "New tab", childIds: [] }],
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add tab
              </Button>
            </div>
          ) : null}

          {effectiveMegaType === "dropdown" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mega.dropdownShowIcons}
                onChange={(e) => onPatchMega({ dropdownShowIcons: e.target.checked })}
              />
              Show icons in dropdown
            </label>
          ) : null}

          {(effectiveMegaType === "grid" ||
            effectiveMegaType === "columns" ||
            effectiveMegaType === "tabbed") &&
          childList.length &&
          itemId ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold">Card subtitles (optional)</div>
              {childList.map((ch) => (
                <WorkspaceLocalizedField
                  key={ch.id}
                  entityType="MenuItem"
                  entityId={makeMenuItemEntityId(menuKey, ch.id)}
                  field="cardSubtitle"
                  label={ch.label}
                  legacyEntity={{
                    cardSubtitle: mega.childDescriptions[ch.id] ?? "",
                  }}
                  onDefaultLocaleChange={(value) =>
                    onPatchMega({
                      childDescriptions: {
                        ...mega.childDescriptions,
                        [ch.id]: value,
                      },
                    })
                  }
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
