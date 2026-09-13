"use client";

import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import type {
  HeaderBuilderCatalog,
  MenuItem,
  MenuItemType,
  MenuLayoutType,
  MenuPlacement,
} from "@/features/navigation/types";
import {
  initMegaFormState,
  megaFormToPersistedConfig,
  type MegaMenuFormState,
} from "@/features/navigation/mega-menu-form";
import { addChildItem, addRootItem, replaceMenuItem } from "@/features/navigation/header-store";
import { $workspace } from "@/features/navigation/header-store";
import { newMenuItemFromForm } from "@/features/navigation/defaults";
import { getItemSubtitle } from "@/features/navigation/menu-engine";
import { useHeaderBuilderCatalog } from "./HeaderBuilderCatalogContext";
import { HeaderField, OptionButtonGroup } from "./header-builder-ui";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { MenuItemLocalizedFields } from "./menu-item-localized-fields";
import { useSyncMenuItemTranslations } from "./use-sync-menu-item-translations";
import { NavigationItemPicker, pickerTypeForItem } from "./shared/NavigationItemPicker";
import type { MenuPickerType } from "./shared/MenuItemTypePicker";
import { MenuItemFlyout } from "./menu-item/MenuItemFlyout";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconPickerField } from "@/features/icons";

export type ModalMode = "add-root" | "add-child" | "edit" | null;

interface FormState {
  pickerType: MenuPickerType;
  type: MenuItemType;
  label: string;
  icon: string;
  megaMenuChildDisplayType: "automatic" | "link" | "card" | "featured" | "icon" | "product";
  badgeText: string;
  placement: MenuPlacement;
  url: string;
  pageId: string;
  collectionId: string;
  brandSlug: string;
  tagSlug: string;
  productId: string;
  packageId: string;
  postId: string;
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

function formPatchForPickerType(
  pickerType: MenuPickerType,
  catalog: HeaderBuilderCatalog,
  prev: FormState,
): Partial<FormState> {
  const cleared: Partial<FormState> = {
    pickerType,
    type: pickerType === "page" ? "page" : pickerType,
    url: "/",
    pageId: "",
    collectionId: "",
    brandSlug: "",
    tagSlug: "",
    productId: "",
    packageId: "",
    postId: "",
    imageUrl: "",
    linkUrl: "#",
  };

  switch (pickerType) {
    case "link":
      return {
        ...cleared,
        type: "link",
        url: prev.url?.trim() && prev.url !== "/" ? prev.url : "/",
        label: prev.label.trim() || "Link",
      };
    case "page":
      return {
        ...cleared,
        type: "page",
        pageId: catalog.pages[0]?.slug ?? "home",
        label: catalog.pages[0]?.title ?? "Page",
      };
    case "collection": {
      const collectionId = catalog.collections[0]?.slug ?? "";
      return {
        ...cleared,
        type: "collection",
        collectionId,
        label: labelForCollectionSlug(catalog, collectionId),
      };
    }
    case "brand": {
      const brandSlug = catalog.brands[0]?.slug ?? "";
      return {
        ...cleared,
        type: "brand",
        brandSlug,
        label: labelForBrandSlug(catalog, brandSlug),
      };
    }
    case "tag": {
      const tagSlug = catalog.tags[0]?.slug ?? "";
      return {
        ...cleared,
        type: "tag",
        tagSlug,
        label: labelForTagSlug(catalog, tagSlug),
      };
    }
    case "product": {
      const productId = catalog.products[0]?.slug ?? "";
      return {
        ...cleared,
        type: "product",
        productId,
        label: labelForProductSlug(catalog, productId),
      };
    }
    case "image":
      return {
        ...cleared,
        type: "image",
        imageUrl: prev.imageUrl || "",
        linkUrl: prev.linkUrl?.trim() ? prev.linkUrl : "#",
        label: prev.label.trim() || "Photo",
      };
    default:
      return cleared;
  }
}

function buildFormState(
  item: MenuItem | null,
  catalog: HeaderBuilderCatalog,
  defaultPlacement: MenuPlacement,
): FormState {
  const type = item?.type ?? "link";
  const pickerType = pickerTypeForItem(item);
  const defaultCollection =
    type === "collection" || type === "packageCategory"
      ? item?.collectionId?.trim() || catalog.collections[0]?.slug || ""
      : item?.collectionId?.trim() || "";

  return {
    pickerType,
    type,
    label: item?.label ?? "",
    icon: item?.icon ?? "",
    megaMenuChildDisplayType: item?.megaMenuChildDisplayType ?? "automatic",
    badgeText: item?.badgeText ?? "",
    placement: item?.placement ?? defaultPlacement,
    url: item?.url ?? "/",
    pageId: item?.pageId ?? catalog.pages[0]?.slug ?? "home",
    collectionId: defaultCollection,
    brandSlug: item?.brandSlug?.trim() || (type === "brand" ? catalog.brands[0]?.slug ?? "" : ""),
    tagSlug: item?.tagSlug?.trim() || (type === "tag" ? catalog.tags[0]?.slug ?? "" : ""),
    productId:
      item?.productId?.trim() ||
      (type === "product" || type === "package" ? catalog.products[0]?.slug ?? "" : ""),
    packageId: item?.packageId?.trim() || item?.productId?.trim() || "",
    postId: item?.postId?.trim() || "",
    imageUrl: item?.imageUrl ?? "",
    linkUrl: item?.linkUrl ?? "#",
    megaMenuType: item?.megaMenuType ?? "",
    mega: initMegaFormState(item),
  };
}

type ModalTab = "overview" | "destination" | "appearance" | "behavior" | "flyout";

export function MenuItemModal({
  mode,
  parentId,
  parentItem,
  itemId,
  defaultPlacement,
  editingItem,
  onClose,
}: Props) {
  const { catalog, refreshCatalog } = useHeaderBuilderCatalog();
  const workspace = useStore($workspace);
  const menuKey = workspace.activeMenuKey;
  const syncMenuItemTranslations = useSyncMenuItemTranslations(menuKey);
  const [form, setForm] = useState(() => buildFormState(editingItem, catalog, defaultPlacement));
  const [tab, setTab] = useState<ModalTab>("overview");

  useEffect(() => {
    if (mode === null) return;
    void refreshCatalog();
    setTab("overview");
  }, [mode, refreshCatalog]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(buildFormState(editingItem, catalog, defaultPlacement));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem, mode, itemId, defaultPlacement]);

  const open = mode !== null;
  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }));
  const patchMega = (partial: Partial<MegaMenuFormState>) =>
    setForm((f) => ({ ...f, mega: { ...f.mega, ...partial } }));

  const title =
    mode === "edit" ? "Edit menu item" : mode === "add-root" ? "Add menu item" : "Add child item";

  const description =
    mode === "add-child" && parentItem
      ? `Under “${parentItem.label}”.`
      : mode === "edit" && editingItem
        ? getItemSubtitle(editingItem)
        : mode === "add-root"
          ? "Add a root-level link."
          : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const label = form.label.trim() || "New Item";
    const built = newMenuItemFromForm({
      type: form.type,
      label,
      icon: form.icon.trim() || undefined,
      megaMenuChildDisplayType: form.megaMenuChildDisplayType,
      placement: form.placement,
      url: form.url,
      pageId: form.pageId,
      collectionId: form.collectionId,
      brandSlug: form.brandSlug,
      tagSlug: form.tagSlug,
      productId: form.productId,
      packageId: form.packageId,
      postId: form.postId,
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
      syncMenuItemTranslations(itemId, {
        label,
        badgeText: form.badgeText.trim(),
      });
    }

    onClose();
  };

  const showFlyoutTab = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="!flex h-[min(90dvh,880px)] max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button]:z-10">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pe-12 text-start">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          {mode === "edit" && editingItem ? (
            <p className="text-sm text-muted-foreground">
              {form.label || editingItem.label} · {form.type}
            </p>
          ) : null}
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as ModalTab)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="shrink-0 border-b px-4 pt-2">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                <TabsTrigger value="overview" className="text-xs">
                  Overview
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
                {showFlyoutTab ? (
                  <TabsTrigger value="flyout" className="text-xs">
                    Flyout
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>

            <div className="hb-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <TabsContent value="overview" className="mt-0 space-y-4 focus-visible:ring-0">
                {mode === "edit" && editingItem ? (
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
                ) : (
                  <HeaderField label="Label" htmlFor="m-label">
                    <Input
                      id="m-label"
                      value={form.label}
                      onChange={(e) => patch({ label: e.target.value })}
                    />
                  </HeaderField>
                )}
                {parentItem ? (
                  <p className="text-xs text-muted-foreground">
                    Parent: <strong>{parentItem.label}</strong>
                  </p>
                ) : null}
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
              </TabsContent>

              <TabsContent value="destination" className="mt-0 space-y-4 focus-visible:ring-0">
                <NavigationItemPicker
                  catalog={catalog}
                  idPrefix="modal-src"
                  editingItem={
                    {
                      ...editingItem,
                      type: form.type,
                      label: form.label,
                      url: form.url,
                      pageId: form.pageId,
                      collectionId: form.collectionId,
                      brandSlug: form.brandSlug,
                      tagSlug: form.tagSlug,
                      productId: form.productId,
                      packageId: form.packageId,
                      postId: form.postId,
                      linkUrl: form.linkUrl,
                      imageUrl: form.imageUrl,
                      placement: form.placement,
                      children: editingItem?.children ?? [],
                      id: editingItem?.id ?? "new",
                    } as MenuItem
                  }
                  pickerType={form.pickerType}
                  onPickerTypeChange={(next) => {
                    setForm((prev) => ({
                      ...prev,
                      ...formPatchForPickerType(next, catalog, prev),
                    }));
                  }}
                  linkUrl={form.pickerType === "image" ? form.linkUrl : form.url}
                  onLinkUrlChange={(url) => {
                    if (form.pickerType === "image") patch({ linkUrl: url });
                    else patch({ url, type: "link" });
                  }}
                  onFieldsChange={(fields) => {
                    const nextLabel = fields.label || form.label;
                    patch({
                      pickerType: fields.pickerType,
                      type: fields.type,
                      label: nextLabel,
                      url: fields.url,
                      pageId: fields.pageId,
                      postId: fields.postId,
                      productId: fields.productId,
                      packageId: fields.packageId,
                      collectionId: fields.collectionId,
                      brandSlug: fields.brandSlug,
                      tagSlug: fields.tagSlug,
                    });
                    if (mode === "edit" && itemId && fields.label) {
                      syncMenuItemTranslations(itemId, { label: nextLabel });
                    }
                  }}
                />
                {form.pickerType === "image" ? (
                  <UrlPrimaryMediaPickerField
                    label="Image"
                    url={form.imageUrl}
                    onChange={(url) => patch({ imageUrl: url })}
                    mediaTypes={["IMAGE", "SVG"]}
                  />
                ) : null}
              </TabsContent>

              <TabsContent value="appearance" className="mt-0 space-y-4 focus-visible:ring-0">
                <IconPickerField
                  label="Icon (optional)"
                  value={form.icon}
                  onChange={(iconId) => patch({ icon: iconId })}
                />
                {mode !== "edit" ? (
                  <HeaderField label="Badge" htmlFor="m-badge">
                    <Input
                      id="m-badge"
                      value={form.badgeText}
                      onChange={(e) => patch({ badgeText: e.target.value })}
                    />
                  </HeaderField>
                ) : null}
                {parentId ? (
                  <HeaderField label="Child display" htmlFor="m-child-display">
                    <select
                      id="m-child-display"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.megaMenuChildDisplayType}
                      onChange={(e) =>
                        patch({
                          megaMenuChildDisplayType: e.target.value as FormState["megaMenuChildDisplayType"],
                        })
                      }
                    >
                      <option value="automatic">Automatic</option>
                      <option value="link">Normal Link</option>
                      <option value="card">Card</option>
                      <option value="featured">Featured</option>
                      <option value="icon">Icon</option>
                      <option value="product">Product</option>
                    </select>
                  </HeaderField>
                ) : null}
              </TabsContent>

              <TabsContent value="behavior" className="mt-0 space-y-4 focus-visible:ring-0">
                <HeaderField label="Placement">
                  <OptionButtonGroup
                    value={form.placement}
                    options={[
                      { value: "both", label: "Both" },
                      { value: "desktop", label: "Desktop" },
                      { value: "mobile", label: "Mobile" },
                    ]}
                    onChange={(v) => patch({ placement: v })}
                    columns={3}
                  />
                </HeaderField>
                <p className="text-xs text-muted-foreground">
                  Visibility and link behavior can also be edited quickly in the Inspector Behavior tab.
                </p>
              </TabsContent>

              {showFlyoutTab ? (
                <TabsContent value="flyout" className="mt-0 focus-visible:ring-0">
                  <MenuItemFlyout
                    menuKey={menuKey}
                    itemId={itemId}
                    editingItem={editingItem}
                    megaMenuType={form.megaMenuType}
                    mega={form.mega}
                    onMegaMenuTypeChange={(v) => patch({ megaMenuType: v })}
                    onPatchMega={patchMega}
                  />
                </TabsContent>
              ) : null}
            </div>
          </Tabs>

          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{mode === "edit" ? "Apply" : "Add item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
