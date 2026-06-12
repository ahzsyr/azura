"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import {
  brandNameToSlug,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";

type Props = {
  profiles: CatalogBrandProfile[];
  onChange: (next: CatalogBrandProfile[]) => void;
};

function newProfile(name: string, sortOrder: number): CatalogBrandProfile {
  return {
    slug: brandNameToSlug(name),
    name,
    logoUrl: "",
    bannerUrl: "",
    descriptionEn: "",
    descriptionAr: "",
    href: "",
    featured: false,
    sortOrder,
  };
}

export function BrandProfilesEditor({ profiles, onChange }: Props) {
  const [draftName, setDraftName] = useState("");

  const updateAt = useCallback(
    (index: number, patch: Partial<CatalogBrandProfile>) => {
      const next = profiles.map((p, i) => {
        if (i !== index) return p;
        const merged = { ...p, ...patch };
        if (patch.name && !patch.slug) {
          merged.slug = brandNameToSlug(merged.name) || p.slug;
        }
        return merged;
      });
      onChange(next);
    },
    [profiles, onChange],
  );

  const addProfile = () => {
    const name = draftName.trim();
    if (!name) return;
    if (profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setDraftName("");
      return;
    }
    onChange([...profiles, newProfile(name, profiles.length)]);
    setDraftName("");
  };

  const removeAt = (index: number) => {
    onChange(profiles.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Add brand name…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addProfile();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={addProfile}>
          Add brand
        </Button>
      </div>

      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border rounded-md border-dashed">
          No brand profiles yet. Add brands or sync from the product catalog.
        </p>
      ) : (
        <ul className="space-y-4">
          {profiles.map((profile, index) => (
            <li key={profile.slug || index} className="rounded-lg border p-4 space-y-3 bg-card/30">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="font-medium text-sm">{profile.name || "Untitled brand"}</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeAt(index)}
                >
                  Remove
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    className="mt-1"
                    value={profile.name}
                    onChange={(e) => updateAt(index, { name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Slug</Label>
                  <Input
                    className="mt-1 font-mono text-xs"
                    value={profile.slug}
                    onChange={(e) => updateAt(index, { slug: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Logo</Label>
                <div className="mt-1">
                  <UrlPrimaryMediaPickerField
                    value={profile.logoUrl}
                    onChange={(url) => updateAt(index, { logoUrl: url })}
                    mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Banner image</Label>
                <div className="mt-1">
                  <UrlPrimaryMediaPickerField
                    value={profile.bannerUrl}
                    onChange={(url) => updateAt(index, { bannerUrl: url })}
                    mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Description (EN)</Label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={profile.descriptionEn}
                    onChange={(e) => updateAt(index, { descriptionEn: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Description (AR)</Label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={profile.descriptionAr}
                    onChange={(e) => updateAt(index, { descriptionAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Landing URL (optional)</Label>
                  <Input
                    className="mt-1"
                    value={profile.href}
                    onChange={(e) => updateAt(index, { href: e.target.value })}
                    placeholder="/products?brand=..."
                  />
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={profile.featured}
                      onChange={(e) => updateAt(index, { featured: e.target.checked })}
                    />
                    Featured
                  </label>
                  <div className="flex-1">
                    <Label className="text-xs">Sort order</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={profile.sortOrder}
                      onChange={(e) =>
                        updateAt(index, { sortOrder: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">{profiles.length} brand profile(s)</p>
    </div>
  );
}
