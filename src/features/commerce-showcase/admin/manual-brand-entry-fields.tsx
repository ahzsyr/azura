"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedItemFields } from "@/features/marketing-blocks/admin/localized-item-fields";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { slugFromBrandName } from "@/features/commerce-showcase/lib/brand-selection";
import type { BrandOverride } from "@/features/commerce-showcase/schemas/showcase-blocks";

export type ManualBrandEntry = {
  slug: string;
  name: string;
  logoUrl: string;
  bannerUrl: string;
  description: string;
  href: string;
  featured?: boolean;
};

type Props = {
  value: ManualBrandEntry;
  onChange: (patch: Partial<ManualBrandEntry>) => void;
  showFeatured?: boolean;
  autoSlug?: boolean;
  compact?: boolean;
};

export function ManualBrandEntryFields({
  value,
  onChange,
  showFeatured = true,
  autoSlug = true,
}: Props) {
  return (
    <div className="space-y-3">
      <LocalizedItemFields
        fields={[{ key: "name", label: "Name" }]}
        values={{ nameEn: value.name, nameAr: value.name }}
        onChange={(patch) => {
          const next = {
            ...value,
            name: patch.nameEn ?? patch.name ?? value.name,
          };
          if (autoSlug && !value.slug.trim()) {
            next.slug = slugFromBrandName(next.name, next.name, value.slug);
          }
          onChange(next);
        }}
      />
      <div>
        <Label className="text-xs">Slug</Label>
        <Input
          className="mt-1 h-8 text-sm font-mono"
          value={value.slug}
          onChange={(e) => onChange({ slug: e.target.value })}
        />
      </div>
      <UrlPrimaryMediaPickerField
        label="Logo"
        mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
        value={value.logoUrl}
        onChange={(url) => onChange({ logoUrl: url })}
      />
      <UrlPrimaryMediaPickerField
        label="Banner image"
        mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
        value={value.bannerUrl}
        onChange={(url) => onChange({ bannerUrl: url })}
      />
      <LocalizedItemFields
        fields={[{ key: "description", label: "Description", multiline: true }]}
        values={{ descriptionEn: value.description, descriptionAr: value.description }}
        onChange={(patch) =>
          onChange({
            description: patch.descriptionEn ?? patch.description ?? value.description,
          })
        }
      />
      <div>
        <Label className="text-xs">Link href</Label>
        <Input
          className="mt-1 h-8 text-sm"
          value={value.href}
          onChange={(e) => onChange({ href: e.target.value })}
          placeholder="/products?brand=..."
        />
      </div>
      {showFeatured ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value.featured)}
            onChange={(e) => onChange({ featured: e.target.checked })}
          />
          Featured
        </label>
      ) : null}
    </div>
  );
}

const EMPTY_OVERRIDE: BrandOverride = {
  logoUrl: "",
  bannerUrl: "",
  description: "",
  href: "",
  name: "",
};

export function BrandOverrideFields({
  value,
  onChange,
  catalogLabel,
}: {
  value: BrandOverride;
  onChange: (patch: Partial<BrandOverride>) => void;
  catalogLabel?: string;
}) {
  const merged = { ...EMPTY_OVERRIDE, ...value };
  return (
    <div className="space-y-3 pt-2 border-t">
      {catalogLabel ? (
        <p className="text-xs text-muted-foreground">
          Override catalog profile for <span className="font-medium">{catalogLabel}</span>. Leave
          fields empty to use catalog defaults.
        </p>
      ) : null}
      <ManualBrandEntryFields
        value={{ ...merged, slug: "", featured: false }}
        onChange={(patch) => onChange(patch)}
        showFeatured={false}
        autoSlug={false}
      />
    </div>
  );
}
