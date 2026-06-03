"use client";

import { useStore } from "@nanostores/react";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";
import type { MenuItem, MenuItemType, MenuLayoutType, MenuPlacement } from "@/features/navigation/types";
import {
  assignChildToTabExclusive,
  clampMegaColumns,
  initMegaFormState,
  megaFormToPersistedConfig,
  type MegaMenuFormState,
} from "@/features/navigation/mega-menu-form";
import { $workspace, addChildItem, addRootItem, replaceMenuItem } from "@/features/navigation/header-store";
import { saveWorkspaceToServer } from "@/features/navigation/header-workspace-api";
import { newMenuItemFromForm } from "@/features/navigation/defaults";
import { generateId, getItemSubtitle } from "@/features/navigation/menu-engine";
import { CollectionSelect, PageSelect, ProductSelect } from "./CatalogSelects";
import { useHeaderBuilderCatalog } from "./HeaderBuilderCatalogContext";
import { HeaderField, HeaderSelect, OptionButtonGroup } from "./header-builder-ui";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
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
import { Textarea } from "@/components/ui/textarea";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";

export type ModalMode = "add-root" | "add-child" | "edit" | null;

interface FormState {
  type: MenuItemType;
  label: string;
  icon: string;
  placement: MenuPlacement;
  url: string;
  pageId: string;
  collectionId: string;
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
    placement: item?.placement ?? defaultPlacement,
    url: item?.url ?? "/",
    pageId: item?.pageId ?? catalog.pages[0]?.slug ?? "home",
    collectionId: defaultCollection,
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
  const workspace = useStore($workspace);
  const adminForm = useAdminFormOptional();
  const [form, setForm] = useState(() => buildFormState(editingItem, catalog, defaultPlacement));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildFormState(editingItem, catalog, defaultPlacement));
  }, [editingItem, mode, itemId, catalog, defaultPlacement]);

  const open = mode !== null;
  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }));
  const patchMega = (partial: Partial<MegaMenuFormState>) =>
    setForm((f) => ({ ...f, mega: { ...f.mega, ...partial } }));

  const siteDefaultMenuType = workspace.settings.menuType;
  const effectiveMegaType: MenuLayoutType = form.megaMenuType || siteDefaultMenuType;
  const childList = editingItem?.children ?? [];
  const type = form.type;

  const title =
    mode === "edit" ? "Edit menu item" : mode === "add-root" ? "Add menu item" : "Add child item";

  const description =
    mode === "add-child" && parentItem
      ? `Under “${parentItem.label}”`
      : mode === "edit" && editingItem
        ? getItemSubtitle(editingItem)
        : mode === "add-root"
          ? "Add a root-level link. After saving, use Add child on any row to build nested items and mega menus."
          : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      setSaving(true);
      const label = form.label.trim() || "New Item";
      const labels = {
        ...(editingItem?.labels ?? {}),
        en: label,
      };
      const built = newMenuItemFromForm({
        type: form.type,
        label,
        icon: form.icon.trim() || undefined,
        placement: form.placement,
        url: form.url,
        pageId: form.pageId,
        collectionId: form.collectionId,
        productId: form.productId,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl,
      });
      built.labels = labels;

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
        });
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
                <h3 className="text-sm font-semibold">Item details</h3>

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
                      <option value="product">Product</option>
                      <option value="image">Photo</option>
                    </HeaderSelect>
                  </HeaderField>

                  {type === "link" ? (
                    <>
                      <HeaderField label="URL" htmlFor="m-url">
                        <Input id="m-url" value={form.url} onChange={(e) => patch({ url: e.target.value })} />
                      </HeaderField>
                      <HeaderField label="Label" htmlFor="m-label">
                        <Input id="m-label" value={form.label} onChange={(e) => patch({ label: e.target.value })} />
                      </HeaderField>
                    </>
                  ) : null}

                  {type === "page" ? (
                    <>
                      <HeaderField label="Page" htmlFor="m-page">
                        <PageSelect
                          catalog={catalog}
                          id="m-page"
                          value={form.pageId}
                          onChange={(pageId) =>
                            patch({ pageId, label: labelForPageSlug(catalog, pageId) })
                          }
                        />
                      </HeaderField>
                      <HeaderField label="Label" htmlFor="m-label-p">
                        <Input
                          id="m-label-p"
                          value={form.label}
                          onChange={(e) => patch({ label: e.target.value })}
                        />
                      </HeaderField>
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
                      <HeaderField label="Label" htmlFor="m-label-c">
                        <Input
                          id="m-label-c"
                          value={form.label}
                          onChange={(e) => patch({ label: e.target.value })}
                        />
                      </HeaderField>
                    </>
                  ) : null}

                  {type === "product" ? (
                    <>
                      <HeaderField label="Product" htmlFor="m-product">
                        <ProductSelect
                          catalog={catalog}
                          id="m-product"
                          value={form.productId}
                          onChange={(productId) =>
                            patch({ productId, label: labelForProductSlug(catalog, productId) })
                          }
                        />
                      </HeaderField>
                      <HeaderField label="Label" htmlFor="m-label-pr">
                        <Input
                          id="m-label-pr"
                          value={form.label}
                          onChange={(e) => patch({ label: e.target.value })}
                        />
                      </HeaderField>
                    </>
                  ) : null}

                  {type === "image" ? (
                    <>
                      <div className="sm:col-span-2">
                        <MediaPickerField
                          label="Image"
                          url={form.imageUrl}
                          trackMediaId={false}
                          idFieldName=""
                          onChange={({ url }) => patch({ imageUrl: url })}
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
                      <HeaderField label="Title" htmlFor="m-label-i">
                        <Input
                          id="m-label-i"
                          value={form.label}
                          onChange={(e) => patch({ label: e.target.value })}
                        />
                      </HeaderField>
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

              {mode === "edit" ? (
                <>
                  <Separator />
                  <section className="hb-add-item-form hb-modal-form-top hb-mega-section space-y-4 !mt-0 !bg-transparent !p-0">
                    <div>
                      <h3 className="text-sm font-semibold">Mega menu (this parent only)</h3>
                      <p className="hb-mega-hint mt-1">
                        Used when this item has child links. Site default layout is{" "}
                        <strong>{siteDefaultMenuType}</strong> — override below if needed.
                      </p>
                    </div>

                    <HeaderField label="Mega menu layout" htmlFor="m-mega-type">
                      <HeaderSelect
                        id="m-mega-type"
                        value={form.megaMenuType}
                        onChange={(v) => patch({ megaMenuType: v as MenuLayoutType | "" })}
                      >
                        <option value="">Use site default ({siteDefaultMenuType})</option>
                        <option value="grid">Grid mega</option>
                        <option value="mixed">Mixed content</option>
                        <option value="columns">Column based</option>
                        <option value="tabbed">Tabbed mega</option>
                        <option value="dropdown">Dropdown list</option>
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
                          <HeaderField label="Title" htmlFor="m-mix-l-title">
                            <Input
                              id="m-mix-l-title"
                              value={form.mega.mixedLeftTitle}
                              onChange={(e) => patchMega({ mixedLeftTitle: e.target.value })}
                            />
                          </HeaderField>
                          <HeaderField label="Body" htmlFor="m-mix-l-body">
                            <Textarea
                              id="m-mix-l-body"
                              rows={2}
                              value={form.mega.mixedLeftBody}
                              onChange={(e) => patchMega({ mixedLeftBody: e.target.value })}
                            />
                          </HeaderField>
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
                          <HeaderField label="Title" htmlFor="m-mix-r-title">
                            <Input
                              id="m-mix-r-title"
                              value={form.mega.mixedRightTitle}
                              onChange={(e) => patchMega({ mixedRightTitle: e.target.value })}
                            />
                          </HeaderField>
                          <HeaderField label="Body" htmlFor="m-mix-r-body">
                            <Textarea
                              id="m-mix-r-body"
                              rows={2}
                              value={form.mega.mixedRightBody}
                              onChange={(e) => patchMega({ mixedRightBody: e.target.value })}
                            />
                          </HeaderField>
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
                              <HeaderField label="Tab label" htmlFor={`tab-label-${tab.id}`} className="hb-grow">
                                <Input
                                  id={`tab-label-${tab.id}`}
                                  value={tab.label}
                                  onChange={(e) => {
                                    const tabs = form.mega.tabs.map((t, i) =>
                                      i === tabIdx ? { ...t, label: e.target.value } : t,
                                    );
                                    patchMega({ tabs });
                                  }}
                                />
                              </HeaderField>
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
                          <HeaderField key={ch.id} label={ch.label} htmlFor={`desc-${ch.id}`}>
                            <Input
                              id={`desc-${ch.id}`}
                              value={form.mega.childDescriptions[ch.id] ?? ""}
                              onChange={(e) =>
                                patchMega({
                                  childDescriptions: {
                                    ...form.mega.childDescriptions,
                                    [ch.id]: e.target.value,
                                  },
                                })
                              }
                              placeholder="Subtitle under title"
                            />
                          </HeaderField>
                        ))}
                      </div>
                    ) : null}
                  </section>
                </>
              ) : null}

              {mode === "edit" && editingItem ? (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <LocaleTabPanel
                      entityType="MenuItem"
                      entityId={editingItem.id}
                      sourceData={{
                        label: form.label,
                        cardSubtitle: form.mega.childDescriptions[editingItem.id] ?? "",
                      }}
                    />
                  </section>
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
