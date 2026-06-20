"use client";

import { useState } from "react";
import type { BlockNode } from "@/types/builder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard, RepeatableSection } from "@/features/content-blocks/admin/shared/repeatable-section";
import { SettingsSection } from "@/components/admin/settings-fields";
import {
  BrandOverrideFields,
  ManualBrandEntryFields,
  type ManualBrandEntry,
} from "@/features/commerce-showcase/admin/manual-brand-entry-fields";
import {
  buildBrandSelectionPatch,
  orderedBrandSlugsFromProps,
  resolveBrandSelectionFromProps,
} from "@/features/commerce-showcase/lib/brand-selection";
import { newShowcaseId, type BrandOverride } from "@/features/commerce-showcase/schemas/showcase-blocks";
import type { BrandBuilderOption } from "@/features/commerce-showcase/types";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ManualBrand = ManualBrandEntry & { id: string; featured: boolean };

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  brandOptions?: BrandBuilderOption[];
  slugListKey?: string;
  selectionKey?: string;
  manualBrandsKey?: string;
  overridesKey?: string;
};

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return items;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BrandThumb({ url, name }: { url?: string; name: string }) {
  if (url) {
    return (
      <div className="relative h-8 w-12 shrink-0 rounded border bg-muted/30 overflow-hidden">
        <Image src={url} alt="" fill className="object-contain p-0.5" sizes="48px" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-muted/30 text-xs font-medium text-muted-foreground">
      {name.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

export function BrandSelectionFields({
  block,
  onChange,
  brandOptions = [],
  slugListKey = "selectedBrandSlugs",
  selectionKey = "brandSelection",
  manualBrandsKey = "manualBrands",
  overridesKey = "brandOverrides",
}: Props) {
  const props = block.props;
  const selection = resolveBrandSelectionFromProps(props as Record<string, unknown>);
  const selectedSlugs = orderedBrandSlugsFromProps(props as Record<string, unknown>);
  const manualBrands = (props[manualBrandsKey] as ManualBrand[]) ?? [];
  const brandOverrides = (props[overridesKey] as Record<string, BrandOverride>) ?? {};
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const patch = (patchProps: Record<string, unknown>) =>
    onChange(patchBlockSettings(block, patchProps));

  const labelForSlug = (slug: string) =>
    brandOptions.find((b) => b.slug === slug)?.label ?? slug;

  const logoForSlug = (slug: string) => {
    const override = brandOverrides[slug];
    if (override?.logoUrl?.trim()) return override.logoUrl;
    return brandOptions.find((b) => b.slug === slug)?.logoUrl;
  };

  const addSlug = (slug: string) => {
    if (!slug || selectedSlugs.includes(slug)) return;
    patch({ [slugListKey]: [...selectedSlugs, slug], sort: "manual" });
  };

  const updateManualBrands = (next: ManualBrand[]) => {
    patch({ [manualBrandsKey]: next, sort: "manual" });
  };

  const updateOverride = (slug: string, overridePatch: Partial<BrandOverride>) => {
    const current = brandOverrides[slug] ?? {};
    patch({
      [overridesKey]: {
        ...brandOverrides,
        [slug]: { ...current, ...overridePatch },
      },
    });
  };

  const handleModeChange = (mode: string) => {
    patch(buildBrandSelectionPatch(mode as "all" | "pick" | "manual", props));
  };

  return (
    <SettingsSection title="Selection">
      <SelectField
        label="Selection mode"
        value={selection}
        options={[
          { value: "all", label: "All catalog brands" },
          { value: "pick", label: "Pick from catalog" },
          { value: "manual", label: "Manual brands only" },
        ]}
        onChange={handleModeChange}
      />

      {selection === "all" ? (
        <p className="text-xs text-muted-foreground">
          All brands from catalog profiles will be shown (up to the limit).{" "}
          <Link href="/admin/catalog-taxonomy" className="text-primary underline-offset-2 hover:underline">
            Manage in Catalog Taxonomy
          </Link>
        </p>
      ) : null}

      {selection === "pick" ? (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Add brand</Label>
            <select
              className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
              value=""
              onChange={(e) => {
                addSlug(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Select a brand…</option>
              {brandOptions
                .filter((b) => !selectedSlugs.includes(b.slug))
                .map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.label}
                  </option>
                ))}
            </select>
            {brandOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                No catalog brands loaded.{" "}
                <Link href="/admin/catalog-taxonomy" className="text-primary underline-offset-2 hover:underline">
                  Add brand profiles
                </Link>
              </p>
            ) : null}
          </div>
          {selectedSlugs.length > 0 ? (
            <ul className="space-y-2">
              {selectedSlugs.map((slug, index) => {
                const expanded = expandedSlug === slug;
                const override = brandOverrides[slug];
                return (
                  <li key={slug} className="rounded-md border bg-background overflow-hidden">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                      <BrandThumb url={logoForSlug(slug)} name={labelForSlug(slug)} />
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-1 min-w-0 text-start"
                        onClick={() => setExpandedSlug(expanded ? null : slug)}
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate font-medium">{labelForSlug(slug)}</span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => patch({ [slugListKey]: moveItem(selectedSlugs, index, -1) })}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === selectedSlugs.length - 1}
                        onClick={() => patch({ [slugListKey]: moveItem(selectedSlugs, index, 1) })}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={() => {
                          const next = { ...brandOverrides };
                          delete next[slug];
                          patch({
                            [slugListKey]: selectedSlugs.filter((s) => s !== slug),
                            [overridesKey]: next,
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                    {expanded ? (
                      <div className="px-3 pb-3">
                        <BrandOverrideFields
                          value={override ?? {}}
                          catalogLabel={labelForSlug(slug)}
                          onChange={(p) => updateOverride(slug, p)}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No brands selected yet.</p>
          )}
        </div>
      ) : null}

      {selection === "manual" ? (
        <RepeatableSection
          label="Manual brands"
          onAdd={() =>
            updateManualBrands([
              ...manualBrands,
              {
                id: newShowcaseId("brand"),
                slug: "",
                name: "",
                logoUrl: "",
                bannerUrl: "",
                description: "",
                href: "",
                featured: false,
              },
            ])
          }
          empty={manualBrands.length === 0}
        >
          {manualBrands.map((brand, index) => (
            <ItemCard
              key={brand.id}
              title={brand.name || brand.slug || `Brand ${index + 1}`}
              onRemove={() => updateManualBrands(manualBrands.filter((b) => b.id !== brand.id))}
            >
              <div className="flex gap-1 justify-end -mt-1 mb-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={index === 0}
                  onClick={() => updateManualBrands(moveItem(manualBrands, index, -1))}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={index === manualBrands.length - 1}
                  onClick={() => updateManualBrands(moveItem(manualBrands, index, 1))}
                >
                  Move down
                </Button>
              </div>
              <ManualBrandEntryFields
                value={brand}
                onChange={(p) =>
                  updateManualBrands(
                    manualBrands.map((b) => (b.id === brand.id ? { ...b, ...p } : b)),
                  )
                }
              />
            </ItemCard>
          ))}
        </RepeatableSection>
      ) : null}
    </SettingsSection>
  );
}

export function OrderedBrandSlugList({
  block,
  onChange,
  brandOptions = [],
  slugListKey = "selectedBrandSlugs",
  overridesKey = "brandOverrides",
  label = "Brand tabs",
}: {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  brandOptions?: BrandBuilderOption[];
  slugListKey?: string;
  overridesKey?: string;
  label?: string;
}) {
  const selectedSlugs = orderedBrandSlugsFromProps(block.props as Record<string, unknown>);
  const brandOverrides = (block.props[overridesKey] as Record<string, BrandOverride>) ?? {};
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const patch = (patchProps: Record<string, unknown>) =>
    onChange(patchBlockSettings(block, patchProps));

  const labelForSlug = (slug: string) =>
    brandOptions.find((b) => b.slug === slug)?.label ?? slug;

  const logoForSlug = (slug: string) => {
    const override = brandOverrides[slug];
    if (override?.logoUrl?.trim()) return override.logoUrl;
    return brandOptions.find((b) => b.slug === slug)?.logoUrl;
  };

  const updateOverride = (slug: string, overridePatch: Partial<BrandOverride>) => {
    const current = brandOverrides[slug] ?? {};
    patch({
      [overridesKey]: {
        ...brandOverrides,
        [slug]: { ...current, ...overridePatch },
      },
    });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <select
        className="w-full rounded-md border h-9 px-2 text-sm"
        value=""
        onChange={(e) => {
          const slug = e.target.value;
          if (!slug || selectedSlugs.includes(slug)) return;
          patch({ [slugListKey]: [...selectedSlugs, slug] });
          e.target.value = "";
        }}
      >
        <option value="">Add brand tab…</option>
        {brandOptions
          .filter((b) => !selectedSlugs.includes(b.slug))
          .map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.label}
            </option>
          ))}
      </select>
      {selectedSlugs.length > 0 ? (
        <ul className="space-y-2">
          {selectedSlugs.map((slug, index) => {
            const expanded = expandedSlug === slug;
            return (
              <li key={slug} className={cn("rounded-md border bg-background overflow-hidden")}>
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <BrandThumb url={logoForSlug(slug)} name={labelForSlug(slug)} />
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-1 min-w-0 text-start"
                    onClick={() => setExpandedSlug(expanded ? null : slug)}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">{labelForSlug(slug)}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => patch({ [slugListKey]: moveItem(selectedSlugs, index, -1) })}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === selectedSlugs.length - 1}
                    onClick={() => patch({ [slugListKey]: moveItem(selectedSlugs, index, 1) })}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => {
                      const next = { ...brandOverrides };
                      delete next[slug];
                      patch({
                        [slugListKey]: selectedSlugs.filter((s) => s !== slug),
                        [overridesKey]: next,
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
                {expanded ? (
                  <div className="px-3 pb-3">
                    <BrandOverrideFields
                      value={brandOverrides[slug] ?? {}}
                      catalogLabel={labelForSlug(slug)}
                      onChange={(p) => updateOverride(slug, p)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No brand tabs selected.</p>
      )}
    </div>
  );
}
