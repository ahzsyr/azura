"use client";

import type { BlockNode } from "@/types/builder";
import { LocalizedItemFields } from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { SettingsSection, ToggleField } from "@/components/admin/settings-fields";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  LocalizedBlockInput,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";
import { ItemCard, RepeatableSection } from "@/features/builder/blocks/content/admin/shared/repeatable-section";
import { OrderedBrandSlugList } from "@/features/builder/blocks/commerce/commerce-showcase/admin/brand-selection-fields";
import { newShowcaseId } from "@/features/builder/blocks/commerce/commerce-showcase/schemas/showcase-blocks";
import type { BrandBuilderOption } from "@/features/builder/blocks/commerce/commerce-showcase/types";

type TabItem = {
  id: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  iconUrl: string;
  imageUrl: string;
};

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

export function TaxonomyProductTabsBlockFields({
  block,
  onChange,
  brandOptions = [],
}: {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  brandOptions?: BrandBuilderOption[];
}) {
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const taxonomy = (block.props.taxonomy as string) ?? "category";
  const tabSource = (block.props.tabSource as string) ?? "auto";
  const productLayout = (block.props.productLayout as string) ?? "grid";
  const tabs = (block.props.tabs as TabItem[]) ?? [];

  const updateTabs = (next: TabItem[]) => setProp("tabs", next);

  const tabsDescription =
    tabSource === "auto"
      ? `Auto · top ${(block.props.autoTabLimit as number) ?? 6} ${taxonomy} tabs`
      : tabSource === "pick"
        ? `Pick brands · ${((block.props.selectedBrandSlugs as string[]) ?? []).length} tabs`
        : `Manual · ${tabs.length} tabs`;

  return (
    <div className="space-y-4">
      <SettingsSection title="Header">
        <LocalizedBlockTitle block={block} />
        <LocalizedBlockInput block={block} field="subtitle" label="Subtitle" />
        <LocalizedBlockInput block={block} field="badge" label="Badge" />
      </SettingsSection>

      <AdminCollapsibleSection title="Tabs" description={tabsDescription} defaultOpen>
        <SettingsSection title="Tab source">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Taxonomy"
              value={taxonomy}
              options={[
                { value: "category", label: "Category" },
                { value: "brand", label: "Brand" },
              ]}
              onChange={(v) => setProp("taxonomy", v)}
            />
            <SelectField
              label="Tab source"
              value={tabSource}
              options={[
                { value: "auto", label: "Auto (top by count)" },
                ...(taxonomy === "brand"
                  ? [{ value: "pick", label: "Pick brands from catalog" }]
                  : []),
                { value: "manual", label: "Manual tabs" },
              ]}
              onChange={(v) => setProp("tabSource", v)}
            />
          </div>

          {tabSource === "auto" ? (
            <div>
              <Label className="text-xs">Auto tab limit</Label>
              <input
                type="number"
                min={1}
                max={24}
                className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                value={(block.props.autoTabLimit as number) ?? 6}
                onChange={(e) => setProp("autoTabLimit", Number(e.target.value))}
              />
            </div>
          ) : null}

          {tabSource === "pick" && taxonomy === "brand" ? (
            <OrderedBrandSlugList
              block={block}
              onChange={onChange}
              brandOptions={brandOptions}
              slugListKey="selectedBrandSlugs"
              overridesKey="brandOverrides"
              label="Brand tabs (ordered)"
            />
          ) : null}

          {tabSource === "manual" ? (
            <RepeatableSection
              label="Manual tabs"
              onAdd={() =>
                updateTabs([
                  ...tabs,
                  {
                    id: newShowcaseId("tab"),
                    slug: "",
                    labelEn: "",
                    labelAr: "",
                    iconUrl: "",
                    imageUrl: "",
                  },
                ])
              }
              empty={tabs.length === 0}
            >
              {tabs.map((tab, index) => (
                <ItemCard
                  key={tab.id}
                  title={tab.labelEn || tab.slug || `Tab ${index + 1}`}
                  onRemove={() => updateTabs(tabs.filter((t) => t.id !== tab.id))}
                >
                  <div>
                    <Label className="text-xs">Slug</Label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={tab.slug}
                      onChange={(e) =>
                        updateTabs(
                          tabs.map((t) => (t.id === tab.id ? { ...t, slug: e.target.value } : t)),
                        )
                      }
                      placeholder={taxonomy === "brand" ? "brand-slug" : "category-slug"}
                    />
                  </div>
                  <LocalizedItemFields
                    fields={[{ key: "label", label: "Label" }]}
                    values={{ labelEn: tab.labelEn, labelAr: tab.labelAr }}
                    onChange={(patch) =>
                      updateTabs(
                        tabs.map((t) =>
                          t.id === tab.id
                            ? {
                                ...t,
                                labelEn: patch.labelEn ?? t.labelEn,
                                labelAr: patch.labelAr ?? t.labelAr,
                              }
                            : t,
                        ),
                      )
                    }
                  />
                  {taxonomy === "brand" ? (
                    <div>
                      <Label className="text-xs">Icon URL</Label>
                      <Input
                        className="mt-1 h-8 text-sm"
                        value={tab.iconUrl}
                        onChange={(e) =>
                          updateTabs(
                            tabs.map((t) =>
                              t.id === tab.id ? { ...t, iconUrl: e.target.value } : t,
                            ),
                          )
                        }
                      />
                    </div>
                  ) : null}
                </ItemCard>
              ))}
            </RepeatableSection>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Tab appearance">
          <SelectField
            label="Nav style"
            value={(block.props.navStyle as string) ?? "horizontal"}
            options={[
              { value: "horizontal", label: "Horizontal" },
              { value: "pills", label: "Pills" },
              { value: "icons", label: "Icons" },
              { value: "vertical", label: "Vertical" },
              { value: "mega", label: "Mega" },
            ]}
            onChange={(v) => setProp("navStyle", v)}
          />
        </SettingsSection>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Products" description={productLayout}>
        <SettingsSection title="Product panel">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Product layout"
              value={productLayout}
              options={[
                { value: "grid", label: "Grid" },
                { value: "carousel", label: "Carousel" },
              ]}
              onChange={(v) => setProp("productLayout", v)}
            />
            {productLayout === "grid" ? (
              <SelectField
                label="Columns"
                value={String((block.props.columns as number) ?? 3)}
                options={[
                  { value: "2", label: "2 columns" },
                  { value: "3", label: "3 columns" },
                  { value: "4", label: "4 columns" },
                ]}
                onChange={(v) => setProp("columns", Number(v) as 2 | 3 | 4)}
              />
            ) : (
              <div>
                <Label className="text-xs">Slides per view</Label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                  value={(block.props.slidesPerView as number) ?? 3}
                  onChange={(e) => setProp("slidesPerView", Number(e.target.value))}
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Products per tab</Label>
              <input
                type="number"
                min={1}
                max={48}
                className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                value={(block.props.productsPerTab as number) ?? 8}
                onChange={(e) => setProp("productsPerTab", Number(e.target.value))}
              />
            </div>
          </div>
          <ToggleField
            label="AJAX tab loading"
            checked={block.props.ajaxEnabled !== false}
            onChange={(v) => setProp("ajaxEnabled", v)}
          />
        </SettingsSection>
      </AdminCollapsibleSection>
    </div>
  );
}
