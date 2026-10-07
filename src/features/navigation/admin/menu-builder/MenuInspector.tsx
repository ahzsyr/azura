"use client";

import type {
  HeaderBuilderCatalog,
  MegaMenuCardAspectRatio,
  MegaMenuChildDisplayType,
  MenuItem,
  MenuLayoutType,
  MenuPlacement,
  MenuItemVisibility,
} from "@/features/navigation/types";
import { getItemHref } from "@/features/navigation/resolve-href";
import { getItemSubtitle } from "@/features/navigation/menu-engine";
import { CompactLocalizedMenuFields } from "../shared/CompactLocalizedMenuFields";
import { MenuItemIconPreview } from "../shared/MenuItemIconPreview";
import { NavigationItemPicker } from "../shared/NavigationItemPicker";
import { resolveMenuItemPreviewImage } from "../shared/resolve-menu-item-preview-image";
import { FLYOUT_LAYOUT_CARDS, layoutLabel } from "../shared/flyout-layout-labels";
import {
  buildPanelOnlyScaffoldMegaMenu,
  buildSidebarScaffoldMegaMenu,
  DEFAULT_MEGA_CARD_ASPECT_RATIO,
  MEGA_CARD_ASPECT_RATIO_OPTIONS,
  normalizeMegaCardAspectRatio,
} from "@/features/navigation/mega-menu-form";
import { generateId } from "@/features/navigation/menu-engine";
import { IconPickerField } from "@/features/icons";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { OptionButtonGroup, HeaderSelect } from "../header-builder-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function normalizeChildAppearance(value: string | undefined): MegaMenuChildDisplayType {
  if (value === "link") return "list";
  if (value === "featured" || value === "product") return "card";
  if (value === "list" || value === "icon" || value === "image" || value === "card" || value === "automatic") {
    return value;
  }
  return "automatic";
}

export type InspectorSection = "content" | "destination" | "appearance" | "behavior" | "flyout";

type Props = {
  item: MenuItem | null;
  menuKey: string;
  catalog: HeaderBuilderCatalog;
  section: InspectorSection;
  onSectionChange: (s: InspectorSection) => void;
  onDeselect: () => void;
  onOpenAdvanced: () => void;
  onAddChild: () => void;
  onPatch: (patch: Partial<MenuItem>) => void;
};

function placementBadge(p: MenuPlacement) {
  if (p === "both") return "Desktop + Mobile";
  if (p === "desktop") return "Desktop";
  return "Mobile";
}

export function MenuInspector({
  item,
  menuKey,
  catalog,
  section,
  onSectionChange,
  onDeselect,
  onOpenAdvanced,
  onAddChild,
  onPatch,
}: Props) {
  if (!item) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Select an item from the tree to edit its properties.
      </div>
    );
  }

  const childCount = item.children?.length ?? 0;
  const effectiveLayout: MenuLayoutType = item.megaMenuType ?? "dropdown";
  const previewImage = resolveMenuItemPreviewImage(item, catalog);

  return (
    <div className="mb-inspector space-y-3">
      <div className="flex items-start justify-between gap-2 rounded-xl border bg-card p-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
            <MenuItemIconPreview icon={item.icon} imageUrl={previewImage} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{item.label || "Untitled"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] uppercase">
                {item.type}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {item.visibility ?? "visible"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {placementBadge(item.placement)}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{getItemSubtitle(item)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={onOpenAdvanced}>
            Advanced
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onDeselect} aria-label="Deselect">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={section} onValueChange={(v) => onSectionChange(v as InspectorSection)}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="content" className="text-xs">
            Content
          </TabsTrigger>
          <TabsTrigger value="destination" className="text-xs">
            Destination
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs">
            Appearance
          </TabsTrigger>
          <TabsTrigger value="behavior" className="text-xs">
            Behavior
          </TabsTrigger>
          <TabsTrigger value="flyout" className="text-xs">
            Flyout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-3 space-y-3 focus-visible:ring-0">
          <CompactLocalizedMenuFields
            menuKey={menuKey}
            itemId={item.id}
            defaultLabel={item.label}
            defaultBadgeText={item.badgeText ?? ""}
            defaultCardSubtitle={(item as { cardSubtitle?: string }).cardSubtitle ?? ""}
            onDefaultLabelChange={(value) => {
              onPatch({ label: value });
            }}
            onDefaultBadgeTextChange={(value) => {
              onPatch({ badgeText: value });
            }}
            onDefaultCardSubtitleChange={(value) => {
              onPatch({ cardSubtitle: value } as Partial<MenuItem>);
            }}
          />
        </TabsContent>

        <TabsContent value="destination" className="mt-3 space-y-3 focus-visible:ring-0">
          <NavigationItemPicker
            catalog={catalog}
            idPrefix={`insp-${item.id}`}
            editingItem={item}
            linkUrl={item.type === "image" ? item.linkUrl : item.url}
            onFieldsChange={(fields) => {
              onPatch({
                type: fields.type,
                label: fields.label || item.label,
                url: fields.url,
                pageId: fields.pageId || undefined,
                postId: fields.postId || undefined,
                productId: fields.productId || undefined,
                packageId: fields.packageId || undefined,
                collectionId: fields.collectionId || undefined,
                brandSlug: fields.brandSlug || undefined,
                tagSlug: fields.tagSlug || undefined,
                ...(fields.pickerType === "image" ? { linkUrl: fields.url } : {}),
              });
            }}
            onLinkUrlChange={(url) => {
              if (item.type === "image") onPatch({ linkUrl: url });
              else onPatch({ url });
            }}
          />
          <p className="text-xs text-muted-foreground">
            Resolves to{" "}
            <code className="rounded bg-muted px-1 py-0.5">{getItemHref(item, "en")}</code>
          </p>
        </TabsContent>

        <TabsContent value="appearance" className="mt-3 space-y-3 focus-visible:ring-0">
          <div className="space-y-1">
            <Label htmlFor="inspector-child-appearance">Child appearance</Label>
            <HeaderSelect
              id="inspector-child-appearance"
              value={normalizeChildAppearance(item.megaMenuChildDisplayType)}
              onChange={(value) => {
                const next = normalizeChildAppearance(value);
                onPatch({
                  megaMenuChildDisplayType: next === "automatic" ? undefined : next,
                });
              }}
            >
              <option value="automatic">Automatic</option>
              <option value="list">Text (list)</option>
              <option value="icon">Icon</option>
              <option value="image">Image</option>
              <option value="card">Card</option>
            </HeaderSelect>
          </div>
          <IconPickerField
            label="Icon"
            value={item.icon ?? ""}
            onChange={(iconId) => {
              onPatch({ icon: iconId });
            }}
          />
          {normalizeChildAppearance(item.megaMenuChildDisplayType) === "image" ||
          normalizeChildAppearance(item.megaMenuChildDisplayType) === "card" ? (
            <UrlPrimaryMediaPickerField
              label="Mega menu image"
              url={item.megaMenuImageUrl ?? ""}
              onChange={(url) => onPatch({ megaMenuImageUrl: url })}
              mediaTypes={["IMAGE", "SVG"]}
            />
          ) : null}
          <div className="space-y-1">
            <Label>Badge</Label>
            <Input
              value={item.badgeText ?? ""}
              onChange={(e) => onPatch({ badgeText: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>CSS class</Label>
            <Input
              value={item.customClass ?? ""}
              onChange={(e) => onPatch({ customClass: e.target.value })}
            />
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="mt-3 space-y-4 focus-visible:ring-0">
          <div className="space-y-1">
            <Label>Visibility</Label>
            <HeaderSelect
              value={item.visibility ?? "visible"}
              onChange={(value) => {
                onPatch({ visibility: value as MenuItemVisibility });
              }}
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </HeaderSelect>
          </div>
          <div className="space-y-1">
            <Label>Placement</Label>
            <OptionButtonGroup
              value={item.placement}
              columns={3}
              options={[
                { value: "both", label: "Both" },
                { value: "desktop", label: "Desktop" },
                { value: "mobile", label: "Mobile" },
              ]}
              onChange={(value) => {
                onPatch({ placement: value as MenuPlacement });
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.openInNewTab === true}
                onChange={(e) => {
                  onPatch({ openInNewTab: e.target.checked });
                }}
              />
              New tab
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.noFollow === true}
                onChange={(e) => {
                  onPatch({ noFollow: e.target.checked });
                }}
              />
              No-follow
            </label>
          </div>
          <div className="space-y-1">
            <Label>Custom CSS</Label>
            <Input
              value={item.customClass ?? ""}
              onChange={(e) => onPatch({ customClass: e.target.value })}
            />
          </div>
        </TabsContent>

        <TabsContent value="flyout" className="mt-3 space-y-3 focus-visible:ring-0">
          <p className="text-xs text-muted-foreground">
            Layout applies to this parent only. Current: <strong>{layoutLabel(effectiveLayout)}</strong>.
            Changes stay draft until you Save, then Publish.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FLYOUT_LAYOUT_CARDS.map((card) => {
              const active = effectiveLayout === card.value;
              return (
                <button
                  key={card.value}
                  type="button"
                  className={cn(
                    "rounded-lg border p-2.5 text-start transition-colors",
                    active
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-muted/40",
                  )}
                  onClick={() => {
                    const isV2 = card.value === "sidebar" || card.value === "panel";
                    const hasPanels = (item.megaMenu?.panels?.length ?? 0) > 0;
                    onPatch({
                      megaMenuType: card.value,
                      megaMenu: isV2
                        ? hasPanels
                          ? {
                              ...(item.megaMenu ?? {}),
                              version: 2,
                              navigation:
                                card.value === "sidebar"
                                  ? {
                                      enabled: true,
                                      width: item.megaMenu?.navigation?.width ?? 220,
                                      items: item.megaMenu?.navigation?.items?.length
                                        ? item.megaMenu.navigation.items
                                        : [
                                            {
                                              id: generateId(),
                                              label: item.label || "Section",
                                              panelId: item.megaMenu!.panels![0].id,
                                            },
                                          ],
                                    }
                                  : item.megaMenu?.navigation,
                            }
                          : card.value === "sidebar"
                            ? buildSidebarScaffoldMegaMenu()
                            : buildPanelOnlyScaffoldMegaMenu()
                        : item.megaMenu,
                    });
                  }}
                >
                  <p className="text-xs font-semibold">{card.label}</p>
                  <p className="text-[10px] text-muted-foreground">{card.description}</p>
                </button>
              );
            })}
          </div>
          {childCount === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              <p>No child items yet.</p>
              <Button type="button" size="sm" className="mt-2" onClick={onAddChild}>
                Add child
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{childCount} child item{childCount === 1 ? "" : "s"}</p>
          )}
          {effectiveLayout !== "dropdown" && effectiveLayout !== "icon" ? (
            <div className="space-y-1">
              <Label htmlFor="inspector-card-aspect">Card image ratio</Label>
              <HeaderSelect
                id="inspector-card-aspect"
                value={normalizeMegaCardAspectRatio(item.megaMenu?.cardAspectRatio)}
                onChange={(value) => {
                  const next = normalizeMegaCardAspectRatio(value);
                  const prev = item.megaMenu ?? {};
                  const { cardAspectRatio: _drop, ...rest } = prev;
                  onPatch({
                    megaMenu:
                      next === DEFAULT_MEGA_CARD_ASPECT_RATIO
                        ? Object.keys(rest).length
                          ? rest
                          : undefined
                        : { ...prev, cardAspectRatio: next as MegaMenuCardAspectRatio },
                  });
                }}
              >
                {MEGA_CARD_ASPECT_RATIO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </HeaderSelect>
            </div>
          ) : null}
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={onOpenAdvanced}>
            Configure flyout
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
