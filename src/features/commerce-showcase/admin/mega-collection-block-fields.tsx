"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import type { CollectionBuilderOption } from "@/features/product-blocks/types";
import { CollectionBuilderSelect } from "@/features/product-blocks/admin/builder-catalog-selects";
import { ShowcaseHeaderFields } from "@/features/commerce-showcase/admin/showcase-shared-fields";
import { LocalizedBlockInput } from "@/features/builder/block-translation-context";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";

export function MegaCollectionBlockFields({
  block,
  onChange,
  collectionOptions = [],
}: {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  collectionOptions?: CollectionBuilderOption[];
}) {
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));

  return (
    <div className="space-y-4">
      <ShowcaseHeaderFields block={block} onChange={onChange} />

      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase">Center products</p>
        <div>
          <Label className="text-xs">Collection</Label>
          <div className="mt-1">
            <CollectionBuilderSelect
              id={`${block.id}-mega-collection`}
              collections={collectionOptions}
              value={(block.props.centerCollectionSlug as string) ?? ""}
              onChange={(slug) => setProp("centerCollectionSlug", slug)}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Or category slug</Label>
          <input
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.centerCategory as string) ?? ""}
            onChange={(e) => setProp("centerCategory", e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase">Right promo</p>
        <UrlPrimaryMediaPickerField
          value={(block.props.rightPromoImageUrl as string) ?? ""}
          onChange={(url) => setProp("rightPromoImageUrl", url)}
          mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
        />
        <LocalizedBlockInput block={block} field="rightPromoTitle" label="Promo title" />
        <LocalizedBlockInput block={block} field="rightPromoCta" label="CTA label" />
        <div>
          <Label className="text-xs">CTA href</Label>
          <input
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.rightPromoHref as string) ?? ""}
            onChange={(e) => setProp("rightPromoHref", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Featured brand slug</Label>
          <input
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.rightFeaturedBrandSlug as string) ?? ""}
            onChange={(e) => setProp("rightFeaturedBrandSlug", e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.props.syncNavToProducts !== false}
          onChange={(e) => setProp("syncNavToProducts", e.target.checked)}
        />
        Sync left nav to center products
      </label>
    </div>
  );
}
