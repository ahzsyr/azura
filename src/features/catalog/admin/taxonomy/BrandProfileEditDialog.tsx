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
  defaultBrandMatchRules,
  emptyCatalogBrandProfile,
  uniqueBrandSlug,
  type CatalogBrandProfile,
} from "@/features/catalog/types/catalog-brand-profile";
import { CatalogSection } from "@/features/catalog/admin/ui";
import { ProductPageLayoutTemplateSelect } from "@/features/products/layout-templates/product-page-layout-template-select";
import { formatLayoutAssignmentLabel, validateTemplateId } from "@/features/products/layout-templates/registry-meta";
import { MatchingRulesEditor } from "@/features/categories/admin/MatchingRulesEditor";
import {
  emptyRuleGroup,
  isEmptyRuleTree,
  upgradeLegacyRuleSet,
} from "@/features/categories/matching";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  profile: CatalogBrandProfile | null;
  existing: CatalogBrandProfile[];
  locale?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: CatalogBrandProfile) => void;
};

export function BrandProfileEditDialog({
  open,
  mode,
  profile,
  existing,
  locale,
  onOpenChange,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<CatalogBrandProfile | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      setSlugEdited(false);
      setError(null);
      return;
    }
    setDraft(mode === "edit" && profile ? { ...profile } : emptyCatalogBrandProfile());
    setSlugEdited(false);
    setError(null);
  }, [open, mode, profile]);

  const updateDraft = (patch: Partial<CatalogBrandProfile>) => {
    if (!draft) return;
    const merged = { ...draft, ...patch };
    if (patch.name && !slugEdited && !patch.slug) {
      merged.slug = brandNameToSlug(merged.name) || draft.slug;
    }
    if (patch.slug !== undefined) {
      setSlugEdited(true);
    }
    setDraft(merged);
    setError(null);
  };

  const handleSave = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError("Brand name is required.");
      return;
    }

    const editingSlug = mode === "edit" ? profile?.slug : undefined;
    const duplicateName = existing.some(
      (item) =>
        item.name.trim().toLowerCase() === name.toLowerCase() &&
        item.slug !== editingSlug,
    );
    if (duplicateName) {
      setError("A brand with this name already exists.");
      return;
    }

    const takenSlugs = existing
      .filter((item) => item.slug !== editingSlug)
      .map((item) => item.slug);
    const slug = uniqueBrandSlug(name, takenSlugs, slugEdited ? draft.slug : undefined);
    const href = draft.href.trim() || `/brands/${slug}`;
    const conditions = isEmptyRuleTree(upgradeLegacyRuleSet(draft.conditions))
      ? defaultBrandMatchRules(name)
      : upgradeLegacyRuleSet(draft.conditions);

    onSave({
      ...draft,
      name,
      slug,
      href,
      conditions,
    });
    onOpenChange(false);
  };

  const isCreate = mode === "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add brand" : "Edit brand"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Create a catalog brand used for product filters, storefront pages, and showcase blocks."
              : "Update identity, imagery, and landing used across catalog and storefront."}
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="space-y-4 py-2">
            <CatalogSection title="Identity" description="Name and slug used in filters, URLs, and product assignment.">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs" htmlFor="brand-name">
                    Name
                  </Label>
                  <Input
                    id="brand-name"
                    className="mt-1"
                    value={draft.name}
                    autoFocus
                    placeholder="e.g. Ubiquiti"
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSave();
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs" htmlFor="brand-slug">
                    Slug
                  </Label>
                  <Input
                    id="brand-slug"
                    className="mt-1 font-mono text-xs"
                    value={draft.slug}
                    placeholder="auto-generated"
                    onChange={(e) => updateDraft({ slug: e.target.value })}
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
            </CatalogSection>

            <CatalogSection title="Appearance" description="Logo and banner imagery for brand pages and showcases.">
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
            </CatalogSection>

            <CatalogSection
              title="Matching Rules"
              description="Products that match these rules are assigned to this brand when you click Sync. Empty rules default to brand name equals."
            >
              <MatchingRulesEditor
                value={upgradeLegacyRuleSet(draft.conditions ?? emptyRuleGroup("any"))}
                onChange={(conditions) => updateDraft({ conditions })}
                locale={locale}
              />
            </CatalogSection>

            <CatalogSection title="Navigation" description="Contextual catalog navigation for this brand.">
              <p className="mb-2 text-xs text-muted-foreground">
                Configure Inherit / Extend / Replace items for this brand in the Navigation builder.
              </p>
              <a
                className="text-sm text-primary underline"
                href={`/admin/catalog/navigation?scopeType=BRAND&scopeId=${encodeURIComponent(draft.slug || brandNameToSlug(draft.name) || "")}`}
              >
                Open Navigation Builder
              </a>
            </CatalogSection>

            <CatalogSection title="Product page layout" description="Applies to all products in this brand unless a category or product override is set.">
              <ProductPageLayoutTemplateSelect
                id="brand-page-layout-template"
                inheritLabel="Inherit (site default)"
                value={draft.pageLayoutTemplate}
                onChange={(pageLayoutTemplate) => updateDraft({ pageLayoutTemplate })}
                hint={
                  draft.pageLayoutTemplate
                    ? formatLayoutAssignmentLabel(
                        validateTemplateId(draft.pageLayoutTemplate),
                        "brand",
                        draft.slug,
                      )
                    : "Products inherit from site default unless a category or product override is set."
                }
              />
            </CatalogSection>

            <CatalogSection title="SEO" description="Landing URL and discovery settings.">
              <div>
                <Label className="text-xs" htmlFor="brand-href">
                  Landing URL
                </Label>
                <Input
                  id="brand-href"
                  className="mt-1"
                  value={draft.href}
                  onChange={(e) => updateDraft({ href: e.target.value })}
                  placeholder="/brands/…"
                />
              </div>
            </CatalogSection>

            <CatalogSection title="Advanced" description="Featured flag and sort order.">
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.featured}
                    onChange={(e) => updateDraft({ featured: e.target.checked })}
                  />
                  Featured
                </label>
                <div className="flex-1">
                  <Label className="text-xs" htmlFor="brand-sort">
                    Sort order
                  </Label>
                  <Input
                    id="brand-sort"
                    type="number"
                    className="mt-1"
                    value={draft.sortOrder}
                    onChange={(e) =>
                      updateDraft({ sortOrder: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </CatalogSection>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!draft}>
            {isCreate ? "Add brand" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
