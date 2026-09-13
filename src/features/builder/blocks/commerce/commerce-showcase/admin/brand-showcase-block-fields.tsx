"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { SettingsSection, TextField, ToggleField } from "@/components/admin/settings-fields";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  LocalizedBlockInput,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";
import { BrandSelectionFields } from "@/features/builder/blocks/commerce/commerce-showcase/admin/brand-selection-fields";
import { brandSelectionSummary } from "@/features/builder/blocks/commerce/commerce-showcase/lib/brand-selection";
import type { BrandBuilderOption } from "@/features/builder/blocks/commerce/commerce-showcase/types";

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

export function BrandShowcaseBlockFields({
  block,
  onChange,
  brandOptions = [],
}: {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  brandOptions?: BrandBuilderOption[];
}) {
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const layout = (block.props.layout as string) ?? "logoGrid";
  const isLogoCarousel = layout === "logoCarousel";
  const brandsSummary = brandSelectionSummary(block.props as Record<string, unknown>);

  return (
    <div className="space-y-4">
      <SettingsSection title="Header">
        <LocalizedBlockTitle block={block} />
        <LocalizedBlockInput block={block} field="subtitle" label="Subtitle" />
        <LocalizedBlockInput block={block} field="badge" label="Badge" />
      </SettingsSection>

      <AdminCollapsibleSection title="Brands" description={brandsSummary} defaultOpen>
        <BrandSelectionFields block={block} onChange={onChange} brandOptions={brandOptions} />
      </AdminCollapsibleSection>

      <SettingsSection title="Layout">
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Layout"
            value={layout}
            options={[
              { value: "logoGrid", label: "Logo grid" },
              { value: "logoCarousel", label: "Logo carousel" },
              { value: "brandCards", label: "Brand cards" },
              { value: "directory", label: "Directory" },
              { value: "featuredBanner", label: "Featured banner" },
              { value: "collectionSlider", label: "Collection slider" },
            ]}
            onChange={(v) => setProp("layout", v)}
          />
          <SelectField
            label="Sort"
            value={(block.props.sort as string) ?? "featuredFirst"}
            options={[
              { value: "featuredFirst", label: "Featured first" },
              { value: "alphabetical", label: "Alphabetical" },
              { value: "productCount", label: "Product count" },
              { value: "manual", label: "Manual order" },
            ]}
            onChange={(v) => setProp("sort", v)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Limit</Label>
            <input
              type="number"
              min={1}
              max={48}
              className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
              value={(block.props.limit as number) ?? 12}
              onChange={(e) => setProp("limit", Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Columns</Label>
            <select
              className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
              value={String(block.props.columns ?? 4)}
              onChange={(e) => setProp("columns", Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ToggleField
          label="Grayscale logos"
          checked={block.props.grayscale !== false}
          onChange={(v) => setProp("grayscale", v)}
        />
        <ToggleField
          label="Color on hover"
          checked={block.props.grayscaleHover !== false}
          onChange={(v) => setProp("grayscaleHover", v)}
        />
        <ToggleField
          label="Show product counts"
          checked={block.props.showCounts !== false}
          onChange={(v) => setProp("showCounts", v)}
        />
        <ToggleField
          label="Show descriptions"
          checked={Boolean(block.props.showDescriptions)}
          onChange={(v) => setProp("showDescriptions", v)}
        />
        <ToggleField
          label="Search (directory)"
          checked={Boolean(block.props.searchEnabled)}
          onChange={(v) => setProp("searchEnabled", v)}
        />
      </SettingsSection>

      {isLogoCarousel ? (
        <AdminCollapsibleSection
          title="Carousel & marquee"
          description="Announcement-bar style scrolling controls"
          defaultOpen
        >
          <SettingsSection title="Display mode">
            <SelectField
              label="Mode"
              value={(block.props.logoCarouselMode as string) ?? "carousel"}
              options={[
                { value: "carousel", label: "Carousel (step)" },
                { value: "marquee", label: "Marquee (continuous)" },
              ]}
              onChange={(v) => setProp("logoCarouselMode", v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="Logo size"
                value={(block.props.logoSize as string) ?? "md"}
                options={[
                  { value: "sm", label: "Small" },
                  { value: "md", label: "Medium" },
                  { value: "lg", label: "Large" },
                ]}
                onChange={(v) => setProp("logoSize", v)}
              />
              <SelectField
                label="Slides per view"
                value={String(block.props.slidesPerView ?? 4)}
                options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
                onChange={(v) => setProp("slidesPerView", Number(v))}
              />
            </div>
          </SettingsSection>

          {(block.props.logoCarouselMode as string) !== "marquee" ? (
            <SettingsSection title="Carousel">
              <ToggleField
                label="Autoplay"
                checked={block.props.autoplay !== false}
                onChange={(v) => setProp("autoplay", v)}
              />
              <div>
                <Label className="text-xs">Autoplay interval (ms)</Label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
                  value={(block.props.autoplayIntervalMs as number) ?? 5000}
                  onChange={(e) => setProp("autoplayIntervalMs", Number(e.target.value))}
                />
              </div>
              <ToggleField
                label="Show arrows"
                checked={block.props.showArrows !== false}
                onChange={(v) => setProp("showArrows", v)}
              />
            </SettingsSection>
          ) : (
            <SettingsSection title="Marquee">
              <div className="grid grid-cols-2 gap-2">
                <SelectField
                  label="Scroll speed"
                  value={(block.props.scrollSpeed as string) ?? "medium"}
                  options={[
                    { value: "slow", label: "Slow" },
                    { value: "medium", label: "Medium" },
                    { value: "fast", label: "Fast" },
                  ]}
                  onChange={(v) => setProp("scrollSpeed", v)}
                />
                <SelectField
                  label="Direction"
                  value={(block.props.scrollDirection as string) ?? "left"}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                  ]}
                  onChange={(v) => setProp("scrollDirection", v)}
                />
              </div>
              <TextField
                label="Separator"
                value={(block.props.separator as string) ?? ""}
                onChange={(v) => setProp("separator", v)}
                placeholder="·"
              />
              <ToggleField
                label="Pause on hover"
                checked={block.props.pauseOnHover !== false}
                onChange={(v) => setProp("pauseOnHover", v)}
              />
              <ToggleField
                label="Edge fade"
                checked={block.props.showEdgeFade !== false}
                onChange={(v) => setProp("showEdgeFade", v)}
              />
              <div>
                <Label className="text-xs">Custom duration (seconds, optional)</Label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
                  value={(block.props.scrollSpeedCustom as number) ?? ""}
                  onChange={(e) =>
                    setProp(
                      "scrollSpeedCustom",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />
              </div>
            </SettingsSection>
          )}
        </AdminCollapsibleSection>
      ) : null}
    </div>
  );
}
