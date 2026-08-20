"use client";

import { useEffect, useState } from "react";
import type { HeaderBuilderCatalog, MenuItem } from "@/features/navigation/types";
import {
  applySourceTargetToFields,
  CollectionSourceCascade,
  PageSourceCascade,
  type SourceCascadeValue,
} from "../SourceCascade";
import { SearchableCatalogSelect } from "../CatalogSelects";
import { MenuItemTypePicker, type MenuPickerType } from "./MenuItemTypePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type NavigationItemPickerFields = ReturnType<typeof applySourceTargetToFields> & {
  pickerType: MenuPickerType;
};

function pickerTypeForItem(item: MenuItem | null): MenuPickerType {
  if (!item) return "page";
  switch (item.type) {
    case "image":
      return "image";
    case "link":
      if (item.url && /^\/(services|hotels-transport|packages)\//.test(item.url)) return "page";
      return "link";
    case "collection":
    case "packageCategory":
      return "collection";
    case "brand":
      return "brand";
    case "tag":
      return "tag";
    case "product":
      return "product";
    default:
      return "page";
  }
}

type Props = {
  catalog: HeaderBuilderCatalog;
  idPrefix: string;
  editingItem?: MenuItem | null;
  /** Controlled picker type; when omitted, derived from editingItem. */
  pickerType?: MenuPickerType;
  onPickerTypeChange?: (next: MenuPickerType) => void;
  onFieldsChange: (fields: Partial<NavigationItemPickerFields>) => void;
  /** Raw link / image URL fields when type is link or image. */
  linkUrl?: string;
  imageUrl?: string;
  onLinkUrlChange?: (url: string) => void;
  onImageUrlChange?: (url: string) => void;
  showTypePicker?: boolean;
  loading?: boolean;
};

/**
 * UI layer over existing source cascades / catalog selects.
 * Does not invent resolution — emits via applySourceTargetToFields / catalog labels.
 */
export function NavigationItemPicker({
  catalog,
  idPrefix,
  editingItem,
  pickerType: controlledType,
  onPickerTypeChange,
  onFieldsChange,
  linkUrl,
  onLinkUrlChange,
  imageUrl,
  onImageUrlChange,
  showTypePicker = true,
  loading,
}: Props) {
  const [internalType, setInternalType] = useState<MenuPickerType>(() =>
    pickerTypeForItem(editingItem ?? null),
  );
  const pickerType = controlledType ?? internalType;

  useEffect(() => {
    if (controlledType != null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInternalType(pickerTypeForItem(editingItem ?? null));
  }, [editingItem, controlledType]);

  const setType = (next: MenuPickerType) => {
    if (onPickerTypeChange) onPickerTypeChange(next);
    else setInternalType(next);
  };

  return (
    <div className="space-y-4">
      {showTypePicker ? (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Destination type
          </Label>
          <MenuItemTypePicker value={pickerType} onChange={setType} />
        </div>
      ) : null}

      {pickerType === "page" ? (
        <PageSourceCascade
          catalog={catalog}
          idPrefix={idPrefix}
          editingItem={editingItem}
          onChange={(next: SourceCascadeValue | null) => {
            if (!next) return;
            const fields = applySourceTargetToFields(next);
            onFieldsChange({ ...fields, pickerType: "page" });
          }}
        />
      ) : null}

      {pickerType === "collection" ? (
        <CollectionSourceCascade
          catalog={catalog}
          idPrefix={`${idPrefix}-col`}
          value={editingItem?.collectionId ?? ""}
          onChange={(collectionId, label) => {
            onFieldsChange({
              pickerType: "collection",
              type: "collection",
              collectionId,
              label,
              url: "",
              pageId: "",
              postId: "",
              productId: "",
              packageId: "",
              brandSlug: "",
              tagSlug: "",
            });
          }}
        />
      ) : null}

      {pickerType === "product" ? (
        <div className="space-y-1">
          <Label>Product</Label>
          <SearchableCatalogSelect
            id={`${idPrefix}-product`}
            options={catalog.products.map((p) => ({
              value: p.slug,
              label: p.name,
              subtitle: `/${p.slug}`,
            }))}
            value={editingItem?.productId ?? ""}
            loading={loading}
            emptyMessage="No products found. Try another name or slug."
            onChange={(productId) => {
              const label = catalog.products.find((p) => p.slug === productId)?.name ?? productId;
              onFieldsChange({
                pickerType: "product",
                type: "product",
                productId,
                label,
                url: "",
                pageId: "",
                postId: "",
                packageId: "",
                collectionId: "",
                brandSlug: "",
                tagSlug: "",
              });
            }}
          />
        </div>
      ) : null}

      {pickerType === "brand" ? (
        <div className="space-y-1">
          <Label>Brand</Label>
          <SearchableCatalogSelect
            id={`${idPrefix}-brand`}
            options={catalog.brands.map((b) => ({
              value: b.slug,
              label: b.name,
              subtitle: `/${b.slug}`,
              imageUrl: b.logoUrl?.trim() || undefined,
            }))}
            value={editingItem?.brandSlug ?? ""}
            loading={loading}
            emptyMessage="No brands found."
            onChange={(brandSlug) => {
              const label = catalog.brands.find((b) => b.slug === brandSlug)?.name ?? brandSlug;
              onFieldsChange({
                pickerType: "brand",
                type: "brand",
                brandSlug,
                label,
                url: "",
                pageId: "",
                postId: "",
                productId: "",
                packageId: "",
                collectionId: "",
                tagSlug: "",
              });
            }}
          />
        </div>
      ) : null}

      {pickerType === "tag" ? (
        <div className="space-y-1">
          <Label>Tag</Label>
          <SearchableCatalogSelect
            id={`${idPrefix}-tag`}
            options={catalog.tags.map((t) => ({
              value: t.slug,
              label: t.name,
              subtitle: `/${t.slug}`,
            }))}
            value={editingItem?.tagSlug ?? ""}
            loading={loading}
            emptyMessage="No tags found."
            onChange={(tagSlug) => {
              const label = catalog.tags.find((t) => t.slug === tagSlug)?.name ?? tagSlug;
              onFieldsChange({
                pickerType: "tag",
                type: "tag",
                tagSlug,
                label,
                url: "",
                pageId: "",
                postId: "",
                productId: "",
                packageId: "",
                collectionId: "",
                brandSlug: "",
              });
            }}
          />
        </div>
      ) : null}

      {pickerType === "link" ? (
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-url`}>URL</Label>
          <Input
            id={`${idPrefix}-url`}
            value={linkUrl ?? editingItem?.url ?? ""}
            onChange={(e) => {
              onLinkUrlChange?.(e.target.value);
              onFieldsChange({
                pickerType: "link",
                type: "link",
                url: e.target.value,
                pageId: "",
                postId: "",
                productId: "",
                packageId: "",
                collectionId: "",
                brandSlug: "",
                tagSlug: "",
                label: editingItem?.label ?? "Link",
              });
            }}
          />
        </div>
      ) : null}

      {pickerType === "image" ? (
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-img-link`}>Link URL</Label>
          <Input
            id={`${idPrefix}-img-link`}
            value={linkUrl ?? editingItem?.linkUrl ?? imageUrl ?? ""}
            onChange={(e) => {
              onImageUrlChange?.(e.target.value);
              onFieldsChange({
                pickerType: "image",
                type: "image",
                url: e.target.value,
                pageId: "",
                postId: "",
                productId: "",
                packageId: "",
                collectionId: "",
                brandSlug: "",
                tagSlug: "",
                label: editingItem?.label ?? "Photo",
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer SearchableCatalogSelect — kept for MenuQuickAdd compatibility. */
export { SearchableCatalogSelect as CatalogListbox, pickerTypeForItem };
