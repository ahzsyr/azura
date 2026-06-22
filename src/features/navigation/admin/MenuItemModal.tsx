"use client";

import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Plus } from "lucide-react";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";
import type { MenuItem, MenuItemType, MenuLayoutType, MenuPlacement } from "@/features/navigation/types";
import {
  assignChildToTabExclusive,
  clampMegaColumns,
  initMegaFormState,
  megaFormToPersistedConfig,
  type MegaMenuFormState,
} from "@/features/navigation/mega-menu-form";
import { addChildItem, addRootItem, replaceMenuItem } from "@/features/navigation/header-store";
import { $workspace } from "@/features/navigation/header-store";
import { saveWorkspaceToServer } from "@/features/navigation/header-workspace-api";
import { newMenuItemFromForm } from "@/features/navigation/defaults";
import { generateId, getItemSubtitle } from "@/features/navigation/menu-engine";
import { DEFAULT_FLYOUT_MENU_TYPE } from "@/features/navigation/resolve-href";
import { BrandSelect, CollectionSelect, PageSelect, ProductSelect, TagSelect } from "./CatalogSelects";
import { useHeaderBuilderCatalog } from "./HeaderBuilderCatalogContext";
import { HeaderField, HeaderSelect, OptionButtonGroup } from "./header-builder-ui";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { WorkspaceLocalizedField } from "@/features/translation/components/workspace-localized-field";
import { useWorkspaceTranslationsOptional } from "@/features/translation/workspace-translation-context";
import {
  makeMegaMenuPanelEntityId,
  makeMegaMenuTabEntityId,
  makeMenuItemEntityId,
} from "@/features/translation/workspace-entity-ids";
import { MenuItemLocalizedFields } from "./menu-item-localized-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export type ModalMode = "add-root" | "add-child" | "edit" | null;

interface FormState {
  type: MenuItemType;
  label: string;
  icon: string;
  badgeText: string;
  placement: MenuPlacement;
  url: string;
  pageId: string;
  collectionId: string;
  brandSlug: string;
  tagSlug: string;
  productId: string;
  imageUrl: string;
  linkUrl: string;
  megaMenuType: MenuLayoutType | "";
  mega: MegaMenuFormState;
}

interface Props {
  mode: ModalMode;
  parentId: string | null;
  parentItem: MenuItem | null;
  itemId: string | null;
  defaultPlacement: MenuPlacement;
  editingItem: MenuItem | null;
  onClose: () => void;
}

function labelForPageSlug(catalog: HeaderBuilderCatalog, pageId: string): string {
  return catalog.pages.find((p) => p.slug === pageId)?.title?.trim() || pageId.trim() || "Page";
}

function labelForCollectionSlug(catalog: HeaderBuilderCatalog, collectionId: string): string {
  return (
    catalog.collections.find((c) => c.slug === collectionId)?.name?.trim() ||
    collectionId.trim() ||
    "Collection"
  );
}

function labelForProductSlug(catalog: HeaderBuilderCatalog, productId: string): string {
  return catalog.products.find((p) => p.slug === productId)?.name?.trim() || productId.trim() || "Product";
}

function labelForBrandSlug(catalog: HeaderBuilderCatalog, brandSlug: string): string {
  return catalog.brands.find((b) => b.slug === brandSlug)?.name?.trim() || brandSlug.trim() || "Brand";
}

function labelForTagSlug(catalog: HeaderBuilderCatalog, tagSlug: string): string {
  return catalog.tags.find((t) => t.slug === tagSlug)?.name?.trim() || tagSlug.trim() || "Tag";
}

function buildFormState(
  item: MenuItem | null,
  catalog: HeaderBuilderCatalog,
  defaultPlacement: MenuPlacement,
): FormState {
  const type = item?.type ?? "link";
  const defaultCollection =
    type === "collection" || type === "packageCategory"
      ? item?.collectionId?.trim() || catalog.collections[0]?.slug || ""
      : item?.collectionId?.trim() || "";

  return {
    type,
    label: item?.label ?? "",
    icon: item?.icon ?? "",
    badgeText: item?.badgeText ?? "",
    placement: item?.placement ?? defaultPlacement,
    url: item?.url ?? "/",
    pageId: item?.pageId ?? catalog.pages[0]?.slug ?? "home",
    collectionId: defaultCollection,
    brandSlug:
      item?.brandSlug?.trim() || (type === "brand" ? catalog.brands[0]?.slug ?? "" : ""),
    tagSlug: item?.tagSlug?.trim() || (type === "tag" ? catalog.tags[0]?.slug ?? "" : ""),
    productId:
      item?.productId?.trim() ||
      (type === "product" || type === "package" ? catalog.products[0]?.slug ?? "" : ""),
    imageUrl: item?.imageUrl ?? "",
    linkUrl: item?.linkUrl ?? "#",
    megaMenuType: item?.megaMenuType ?? "",
    mega: initMegaFormState(item),
  };
}

export function MenuItemModal({
  mode,
  parentId,
  parentItem,
  itemId,
  defaultPlacement,
  editingItem,
  onClose,
}: Props) {
  const catalog = useHeaderBuilderCatalog();
  const adminForm = useAdminFormOptional();
  const workspaceTranslations = useWorkspaceTranslationsOptional();
  const workspace = useStore($workspace);
  const menuKey = workspace.activeMenuKey;
  const [form, setForm] = useState(() => buildFormState(editingItem, catalog, defaultPlacement));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildFormState(editingItem, catalog, defaultPlacement));
  }, [editingItem, mode, itemId, catalog, defaultPlacement]);

  const open = mode !== null;
  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }));
  const patchMega = (partial: Partial<MegaMenuFormState>) =>
    setForm((f) => ({ ...f, mega: { ...f.mega, ...partial } }));

  const effectiveMegaType: MenuLayoutType = form.megaMenuType || DEFAULT_FLYOUT_MENU_TYPE;
  const childList = editingItem?.children ?? [];
  const hasFlyoutChildren = (editingItem?.children?.length ?? 0) > 0;
  const type = form.type;

  const title =
    mode === "edit" ? "Edit menu item" : mode === "add-root" ? "Add menu item" : "Add child item";

  const description =
    mode === "add-child" && parentItem
      ? `Under “${parentItem.label}”. The parent flyout defaults to a dropdown list — edit the parent to switch to grid mega or another layout.`
      : mode === "edit" && editingItem
        ? getItemSubtitle(editingItem)
        : mode === "add-root"
          ? "Add a root-level link. Use Add child on any row to build nested items (dropdown list by default)."
          : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      setSaving(true);
      const label = form.label.trim() || "New Item";
      const built = newMenuItemFromForm({
        type: form.type,
        label,
        icon: form.icon.trim() || undefined,
        placement: form.placement,
        url: form.url,
        pageId: form.pageId,
        collectionId: form.collectionId,
        brandSlug: form.brandSlug,
        tagSlug: form.tagSlug,
        productId: form.productId,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl,
      });

      if (mode === "add-root") {
        addRootItem(built);
      } else if (mode === "add-child" && parentId) {
        addChildItem(parentId, built);
      } else if (mode === "edit" && itemId && editingItem) {
        const megaMenu = megaFormToPersistedConfig(form.mega);
        replaceMenuItem(itemId, {
          ...built,
          id: editingItem.id,
          children: editingItem.children,
          megaMenuType: form.megaMenuType || undefined,
          megaMenu,
          badgeText: form.badgeText.trim() || undefined,
        });
      }

      if (workspaceTranslations) {
        await workspaceTranslations.flushTranslations();
      }
      const saved = await saveWorkspaceToServer();
      setSaving(false);
      if (!saved.ok) {
        adminForm?.showToast(saved.error ?? "Save failed after menu change.", "error");
        return;
      }
      onClose();
    })();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="!flex h-[min(90dvh,880px)] max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button]:z-10">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pe-12 text-start">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="hb-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-6 px-6 py-4">
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Item details</h3>
                  <p className="text-xs text-muted-foreground">
                    Use <strong>Page</strong> for catalog listing pages (e.g. Products). Use{" "}
                    <strong>Product</strong> for a single product detail page.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <HeaderField label="Item type" htmlFor="m-type">
                    <HeaderSelect
                      id="m-type"
                      value={type}
                      onChange={(next) => {
                        const itemType = next as MenuItemType;
                        if (itemType === "page") {
                          patch({ type: itemType, label: labelForPageSlug(catalog, form.pageId) });
                        } else if (itemType === "collection") {
                          patch({
                            type: itemType,
                            label: labelForCollectionSlug(catalog, form.collectionId),
                          });
                        } else if (itemType === "brand") {
                          patch({ type: itemType, label: labelForBrandSlug(catalog, form.brandSlug) });
                        } else if (itemType === "tag") {
                          patch({ type: itemType, label: labelForTagSlug(catalog, form.tagSlug) });
                        } else if (itemType === "product") {
                          patch({ type: itemType, label: labelForProductSlug(catalog, form.productId) });
                        } else {
                          patch({ type: itemType });
                        }
                      }}
                    >
                      <option value="link">Link</option>
                      <option value="page">Page</option>
                      <option value="collection">Collection</option>
                      <option value="brand">Brand</option>
                      <option value="tag">Tag</option>
                      <option value="product">Product</option>
                      <option value="image">Photo</option>
                    </HeaderSelect>
                  </HeaderField>

                  {type === "link" ? (
                    <>
                      <HeaderField label="URL" htmlFor="m-url">
                        <Input id="m-url" value={form.url} onChange={(e) => patch({ url: e.target.value })} />
                      </HeaderField>
                      {mode !== "edit" ? (
                        <HeaderField label="Label" htmlFor="m-label">
                          <Input
                            id="m-label"
                            value={form.label}
                            onChange={(e) => patch({ label: e.target.value })}
                          />
                        </HeaderField>
                      ) : null}
                    </>
                  ) : null}

                  {type === "page" ? (
                    <>
                      <HeaderField
                        label="Page"
                        htmlFor="m-page"
                        hint="Catalog listing pages include Products, Collections, and other wired routes."
                      >
                        <PageSelect
                          catalog={catalog}
                          id="m-page"
                          value={form.pageId}
                          onChange={(pageId) =>
                            patch({ pageId, label: labelForPageSlug(catalog, pageId) })
                          }
                        />
                      </HeaderField>
                      {mode !== "edit" ? (
                        <HeaderField label="Label" htmlFor="m-label-p">
                          <Input
                            id="m-label-p"
                            value={form.label}
                            onChange={(e) => patch({ label: e.target.value })}
                          />
                        </HeaderField>
                      ) : null}
                    </>
                  ) : null}

                  {type === "collection" ? (
                    <>
                      <HeaderField label="Collection" htmlFor="m-col">
                        <CollectionSelect
                          catalog={catalog}
                          id="m-col"
                          value={form.collectionId}
                          onChange={(collectionId) =>
                            patch({ collectionId, label: labelForCollectionSlug(catalog, collectionId) })
                          }
                        />
                      </HeaderField>
                      {mode !== "edit" ? (
                        <HeaderField label="Label" htmlFor="m-label-c">
                          <Input
                            id="m-label-c"
                            value={form.label}
                            onChange={(e) => patch({ label: e.target.value })}
                          />
                        </HeaderField>
                      ) : null}
                    </>
                  ) : null}

                  {type === "product" ? (
                    <>
                      <HeaderField
                        label="Product"
                        htmlFor="m-product"
                        hint="Links to one product detail page, not the full catalog listing."
                      >
                        <ProductSelect
                          catalog={catalog}
                          id="m-product"
                          value={form.productId}
                          onChange={(productId) =>
                            patch({ productId, label: labelForProductSlug(catalog, productId) })
                          }
                        />
                      </HeaderField>
                      {mode !== "edit" ? (
                        <HeaderField label="Label" htmlFor="m-label-pr">
                          <Input
                            id="m-label-pr"
                            value={form.label}
                            onChange={(e) => patch({ label: e.target.value })}
                          />
                        </HeaderField>
                      ) : null}
                    </>
                  ) : null}

                  {type === "brand" ? (
                    <>
                      <HeaderField label="Brand" htmlFor="m-brand">
                        <BrandSelect
                          catalog={catalog}
                          id="m-brand"
                          value={form.brandSlug}
                          onChange={(brandSlug) =>
                            patch({ brandSlug, label: labelForBrandSlug(catalog, brandSlug) })
                          }
                        />
                      </HeaderField>
                      {mode !== "edit" ? (
                        <HeaderField label="Label" htmlFor="m-label-b">
                          <Input
                            id="m-label-b"
                            value={form.label}
                            onChange={(e) => patch({ label: e.target.value })}
                          />
                        </HeaderField>
                      ) : null}
                    </>
                  ) : null}

                  {type === "tag" ? (
                    <>
                      <HeaderField label="Tag" htmlFor="m-tag">
                        <TagSelect
                          catalog={catalog}
                          id="m-tag"
                          value={form.tagSlug}
                          onChange={(tagSlug) =>
                            patch({ tagSlug, label: labelForTagSlug(catalog, tagSlug) })
                          }
                        />
                      </HeaderField>
                      {mode !== "edit" ? (
                        <HeaderField label="Label" htmlFor="m-label-t">
                          <Input
                            id="m-label-t"
                            value={form.label}
                            onChange={(e) => patch({ label: e.target.value })}
                          />
                        </HeaderField>
                      ) : null}
                    </>
                  ) : null}

                  {type === "image" ? (
                    <>
                      <div className="sm:col-span-2">
                        <UrlPrimaryMediaPickerField
                          label="Image"
                          url={form.imageUrl}
                          onChange={(url) => patch({ imageUrl: url })}
                          mediaTypes={["IMAGE", "SVG"]}
                        />
                      </div>
                      <HeaderField label="Link URL" htmlFor="m-img-link">
                        <Input
                          id="m-img-link"
                          value={form.linkUrl}
                          onChange={(e) => patch({ linkUrl: e.target.value })}
                        />
                      </HeaderField>
                      {mode !== "edit" ? (
                        <HeaderField label="Title" htmlFor="m-label-i">
                          <Input
                            id="m-label-i"
                            value={form.label}
                            onChange={(e) => patch({ label: e.target.value })}
                          />
                        </HeaderField>
                      ) : null}
                    </>
                  ) : null}

                  <HeaderField
                    label="Icon (optional)"
                    htmlFor="m-icon"
                    hint="Font Awesome class, e.g. fa-star"
                    className="sm:col-span-2"
                  >
                    <Input
                      id="m-icon"
                      value={form.icon}
                      onChange={(e) => patch({ icon: e.target.value })}
                      placeholder="Leave empty for no icon"
                    />
                  </HeaderField>
                </div>

                <HeaderField label="Placement">
                  <OptionButtonGroup
                    value={form.placement}
                    options={[
                      { value: "both", label: "Desktop & mobile" },
                      { value: "desktop", label: "Desktop only" },
                      { value: "mobile", label: "Mobile only" },
                    ]}
                    onChange={(v) => patch({ placement: v })}
                    columns={3}
                  />
                </HeaderField>
              </section>

              {mode === "edit" && hasFlyoutChildren ? (
                <>
                  <Separator />
                  <section className="hb-add-item-form hb-modal-form-top hb-mega-section space-y-4 !mt-0 !bg-transparent !p-0">
                    <div>
                      <h3 className="text-sm font-semibold">Flyout layout (this parent only)</h3>
                      <p className="hb-mega-hint mt-1">
                        Controls how child links appear on desktop. New parents default to a{" "}
                        <strong>dropdown list</strong> — choose grid mega or another type below if
                        needed.
                      </p>
                    </div>

                    <HeaderField label="Flyout layout" htmlFor="m-mega-type">
                      <HeaderSelect
                        id="m-mega-type"
                        value={form.megaMenuType}
                        onChange={(v) => patch({ megaMenuType: v as MenuLayoutType | "" })}
                      >
                        <option value="">Dropdown list (default)</option>
                        <option value="grid">Grid mega</option>
                        <option value="mixed">Mixed content</option>
                        <option value="columns">Column based</option>
                        <option value="tabbed">Tabbed mega</option>
                      </HeaderSelect>
                    </HeaderField>

                    {(effectiveMegaType === "grid" || effectiveMegaType === "tabbed") && (
                      <HeaderField label="Grid columns (2–4)" htmlFor="m-grid-cols">
                        <Input
                          id="m-grid-cols"
                          type="number"
                          min={2}
                          max={4}
                          value={form.mega.gridColumns}
                          onChange={(e) =>
                            patchMega({ gridColumns: clampMegaColumns(Number(e.target.value)) })
                          }
                        />
                      </HeaderField>
                    )}

                    {effectiveMegaType === "columns" && (
                      <HeaderField label="Columns (2–4)" htmlFor="m-col-count">
                        <Input
                          id="m-col-count"
                          type="number"
                          min={2}
                          max={4}
                          value={form.mega.columnCount}
                          onChange={(e) =>
                            patchMega({ columnCount: clampMegaColumns(Number(e.target.value)) })
                          }
                        />
                      </HeaderField>
                    )}

                    {effectiveMegaType === "mixed" && (
                      <div className="hb-form-row hb-mega-mixed-grid">
                        <div className="hb-form-group space-y-3">
                          <div className="text-sm font-semibold">Left panel</div>
                          <WorkspaceLocalizedField
                            entityType="MegaMenuPanel"
                            entityId={makeMegaMenuPanelEntityId(menuKey, `${itemId}:left`)}
                            field="title"
                            legacyEntity={{ title: form.mega.mixedLeftTitle }}
                            onDefaultLocaleChange={(mixedLeftTitle) => patchMega({ mixedLeftTitle })}
                          />
                          <WorkspaceLocalizedField
                            entityType="MegaMenuPanel"
                            entityId={makeMegaMenuPanelEntityId(menuKey, `${itemId}:left`)}
                            field="body"
                            legacyEntity={{ body: form.mega.mixedLeftBody }}
                            multiline
                            rows={2}
                            onDefaultLocaleChange={(mixedLeftBody) => patchMega({ mixedLeftBody })}
                          />
                          <HeaderField label="Icon (optional)" htmlFor="m-mix-l-icon">
                            <Input
                              id="m-mix-l-icon"
                              value={form.mega.mixedLeftIcon}
                              onChange={(e) => patchMega({ mixedLeftIcon: e.target.value })}
                            />
                          </HeaderField>
                        </div>
                        <div className="hb-form-group space-y-3">
                          <div className="text-sm font-semibold">Right panel</div>
                          <WorkspaceLocalizedField
                            entityType="MegaMenuPanel"
                            entityId={makeMegaMenuPanelEntityId(menuKey, `${itemId}:right`)}
                            field="title"
                            legacyEntity={{ title: form.mega.mixedRightTitle }}
                            onDefaultLocaleChange={(mixedRightTitle) => patchMega({ mixedRightTitle })}
                          />
                          <WorkspaceLocalizedField
                            entityType="MegaMenuPanel"
                            entityId={makeMegaMenuPanelEntityId(menuKey, `${itemId}:right`)}
                            field="body"
                            legacyEntity={{ body: form.mega.mixedRightBody }}
                            multiline
                            rows={2}
                            onDefaultLocaleChange={(mixedRightBody) => patchMega({ mixedRightBody })}
                          />
                          <HeaderField label="Icon (optional)" htmlFor="m-mix-r-icon">
                            <Input
                              id="m-mix-r-icon"
                              value={form.mega.mixedRightIcon}
                              onChange={(e) => patchMega({ mixedRightIcon: e.target.value })}
                            />
                          </HeaderField>
                        </div>
                      </div>
                    )}

                    {effectiveMegaType === "tabbed" && (
                      <div className="hb-mega-tabs-editor">
                        <div className="text-sm font-semibold">Tabs & child assignment</div>
                        <p className="hb-mega-hint">
                          Each child can belong to one tab. Unassigned children appear under the first tab.
                        </p>
                        {form.mega.tabs.map((tab, tabIdx) => (
                          <div key={tab.id} className="hb-mega-tab-block">
                            <div className="hb-form-row hb-mega-tab-head">
                              <div className="hb-grow">
                                <WorkspaceLocalizedField
                                  entityType="MegaMenuTab"
                                  entityId={makeMegaMenuTabEntityId(menuKey, itemId!, tab.id)}
                                  field="label"
                                  legacyEntity={{ label: tab.label }}
                                  onDefaultLocaleChange={(label) => {
                                    const tabs = form.mega.tabs.map((t, i) =>
                                      i === tabIdx ? { ...t, label } : t,
                                    );
                                    patchMega({ tabs });
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const tabs = form.mega.tabs.filter((_, i) => i !== tabIdx);
                                  patchMega({ tabs: tabs.length ? tabs : form.mega.tabs });
                                }}
                                disabled={form.mega.tabs.length <= 1}
                              >
                                Remove tab
                              </Button>
                            </div>
                            <div className="hb-mega-child-checks">
                              {childList.map((ch) => (
                                <label key={ch.id} className="hb-check-label">
                                  <input
                                    type="checkbox"
                                    checked={tab.childIds.includes(ch.id)}
                                    onChange={(e) => {
                                      patchMega({
                                        tabs: assignChildToTabExclusive(
                                          form.mega.tabs,
                                          tabIdx,
                                          ch.id,
                                          e.target.checked,
                                        ),
                                      });
                                    }}
                                  />
                                  {ch.label}
                                </label>
                              ))}
                              {!childList.length ? (
                                <span className="hb-mega-hint">No child items yet.</span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            patchMega({
                              tabs: [...form.mega.tabs, { id: generateId(), label: "New tab", childIds: [] }],
                            })
                          }
                        >
                          <Plus className="h-4 w-4" />
                          Add tab
                        </Button>
                      </div>
                    )}

                    {effectiveMegaType === "dropdown" && (
                      <label className="hb-check-label hb-inline flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.mega.dropdownShowIcons}
                          onChange={(e) => patchMega({ dropdownShowIcons: e.target.checked })}
                        />
                        Show icons in dropdown (when child has an icon set)
                      </label>
                    )}

                    {(effectiveMegaType === "grid" ||
                      effectiveMegaType === "columns" ||
                      effectiveMegaType === "tabbed") &&
                    childList.length ? (
                      <div className="hb-mega-descriptions space-y-3">
                        <div className="text-sm font-semibold">Card subtitles (optional)</div>
                        {childList.map((ch) => (
                          <WorkspaceLocalizedField
                            key={ch.id}
                            entityType="MenuItem"
                            entityId={makeMenuItemEntityId(menuKey, ch.id)}
                            field="cardSubtitle"
                            label={ch.label}
                            legacyEntity={{
                              cardSubtitle: form.mega.childDescriptions[ch.id] ?? "",
                            }}
                            onDefaultLocaleChange={(value) =>
                              patchMega({
                                childDescriptions: {
                                  ...form.mega.childDescriptions,
                                  [ch.id]: value,
                                },
                              })
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>
                </>
              ) : null}

              {mode === "edit" && editingItem ? (
                <>
                  <Separator />
                  <MenuItemLocalizedFields
                    menuKey={menuKey}
                    itemId={editingItem.id}
                    defaultLabel={form.label}
                    defaultBadgeText={form.badgeText}
                    defaultCardSubtitle={form.mega.childDescriptions[editingItem.id] ?? ""}
                    onDefaultLabelChange={(value) => patch({ label: value })}
                    onDefaultBadgeTextChange={(value) => patch({ badgeText: value })}
                    onDefaultCardSubtitleChange={(value) =>
                      patchMega({
                        childDescriptions: {
                          ...form.mega.childDescriptions,
                          [editingItem.id]: value,
                        },
                      })
                    }
                  />
                </>
              ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "edit" ? "Save item" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
