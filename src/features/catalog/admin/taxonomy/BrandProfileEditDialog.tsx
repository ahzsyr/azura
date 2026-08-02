"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { LocalizedItemFields } from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import {
  brandNameToSlug,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";

type Props = {
  open: boolean;
  profile: CatalogBrandProfile | null;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<CatalogBrandProfile>) => void;
};

export function BrandProfileEditDialog({ open, profile, onOpenChange, onSave }: Props) {
  const [draft, setDraft] = useState<CatalogBrandProfile | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setDraft({ ...profile });
      setSlugEdited(false);
    } else if (!open) {
      setDraft(null);
      setSlugEdited(false);
    }
  }, [open, profile]);

  const updateDraft = (patch: Partial<CatalogBrandProfile>) => {
    if (!draft) return;
    const merged = { ...draft, ...patch };
    if (patch.name && !slugEdited && !patch.slug) {
      merged.slug = brandNameToSlug(merged.name) || draft.slug;
    }
    if (patch.slug) {
      setSlugEdited(true);
    }
    setDraft(merged);
  };

  const handleSave = () => {
    if (!draft) return;
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit brand profile</DialogTitle>
          <DialogDescription>
            Update logo, descriptions, and landing URL for storefront brand showcase blocks.
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  className="mt-1"
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={draft.slug}
                  onChange={(e) => updateDraft({ slug: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Logo</Label>
              <div className="mt-1">
                <UrlPrimaryMediaPickerField
                  value={draft.logoUrl}
                  onChange={(url) => updateDraft({ logoUrl: url })}
                  mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Banner image</Label>
              <div className="mt-1">
                <UrlPrimaryMediaPickerField
                  value={draft.bannerUrl}
                  onChange={(url) => updateDraft({ bannerUrl: url })}
                  mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
                />
              </div>
            </div>

            <LocalizedItemFields
              fields={[{ key: "description", label: "Description", multiline: true }]}
              values={{
                descriptionEn: draft.descriptionEn,
                descriptionAr: draft.descriptionAr,
              }}
              onChange={(patch) =>
                updateDraft({
                  descriptionEn: patch.descriptionEn ?? draft.descriptionEn,
                  descriptionAr: patch.descriptionAr ?? draft.descriptionAr,
                })
              }
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Landing URL (optional)</Label>
                <Input
                  className="mt-1"
                  value={draft.href}
                  onChange={(e) => updateDraft({ href: e.target.value })}
                  placeholder="/products?brand=..."
                />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.featured}
                    onChange={(e) => updateDraft({ featured: e.target.checked })}
                  />
                  Featured
                </label>
                <div className="flex-1">
                  <Label className="text-xs">Sort order</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={draft.sortOrder}
                    onChange={(e) =>
                      updateDraft({ sortOrder: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!draft}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
