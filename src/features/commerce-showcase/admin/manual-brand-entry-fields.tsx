"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { slugFromBrandName } from "@/features/commerce-showcase/lib/brand-selection";
import type { BrandOverride } from "@/features/commerce-showcase/schemas/showcase-blocks";

export type ManualBrandEntry = {
  slug: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string;
  bannerUrl: string;
  descriptionEn: string;
  descriptionAr: string;
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
  const patchName = (field: "nameEn" | "nameAr", next: string) => {
    const patch: Partial<ManualBrandEntry> = { [field]: next };
    if (autoSlug && !value.slug.trim()) {
      const nameEn = field === "nameEn" ? next : value.nameEn;
      const nameAr = field === "nameAr" ? next : value.nameAr;
      patch.slug = slugFromBrandName(nameEn, nameAr, value.slug);
    }
    onChange(patch);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Name (EN)</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={value.nameEn}
            onChange={(e) => patchName("nameEn", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Name (AR)</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={value.nameAr}
            onChange={(e) => patchName("nameAr", e.target.value)}
          />
        </div>
      </div>
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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Description (EN)</Label>
          <Textarea
            className="mt-1 text-sm"
            rows={2}
            value={value.descriptionEn}
            onChange={(e) => onChange({ descriptionEn: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Description (AR)</Label>
          <Textarea
            className="mt-1 text-sm"
            rows={2}
            value={value.descriptionAr}
            onChange={(e) => onChange({ descriptionAr: e.target.value })}
          />
        </div>
      </div>
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
  descriptionEn: "",
  descriptionAr: "",
  href: "",
  nameEn: "",
  nameAr: "",
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
