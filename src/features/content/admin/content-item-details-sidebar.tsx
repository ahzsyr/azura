"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ContentFieldDefinition } from "@/features/content/types";
import type { ContentCollection, ContentItem, ContentType } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import type { EntityTranslation } from "@prisma/client";
import { ENTITY_REGISTRY } from "@/features/translation/entity-registry";
import { LocalizedFields } from "@/features/translation/components/localized-fields";
import { translationsToFieldValues } from "@/features/translation/block-translation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { SLUG_INPUT_PATTERN_OPTIONAL } from "@/lib/slug-pattern";
import { PriceFieldInput } from "@/features/content/admin/price-field-input";
import type { DisplaySettings } from "@/schemas/catalog/display-settings";
import { EntityDisplaySettingsPanel } from "@/features/catalog/admin/entity-display-settings-panel";
import { TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";

type Props = {
  fields: ContentFieldDefinition[];
  item?: ContentItem;
  attributes: Record<string, unknown>;
  collections?: ContentCollection[];
  contentType: ContentType;
  locales: PublicLocale[];
  itemTranslations?: EntityTranslation[];
  displaySettings?: Partial<DisplaySettings>;
  onDisplaySettingsChange?: (next: Partial<DisplaySettings>) => void;
};

const GROUP_LABEL_MAP: Record<string, string> = {
  core: "Core",
  pricing: "Pricing",
  cta: "CTA",
  details: "Details",
  location: "Location",
  content: "Content",
  display: "Display",
  attributes: "Attributes",
};

function getAttr(
  attrs: Record<string, unknown>,
  key: string,
  localeCode: string,
  localized?: boolean
) {
  if (localized) {
    const suffix = getContentFieldSuffix(localeCode);
    return attrs[`${key}${suffix}`] ?? attrs[key] ?? "";
  }
  return attrs[key] ?? "";
}

type FieldProps = {
  field: ContentFieldDefinition;
  attrs: Record<string, unknown>;
  locales: PublicLocale[];
  defaultLocaleCode: string;
};

function AttributeField({ field, attrs, locales, defaultLocaleCode }: FieldProps) {
  if (!field.localized) {
    if (field.type === "price") {
      const amount = getAttr(attrs, field.key, "en");
      const currencyAttr = String(attrs.currency ?? "");
      return (
        <PriceFieldInput
          label={field.labelEn}
          amountName={field.key}
          defaultAmount={amount === "" ? "" : String(amount)}
          defaultCurrency={currencyAttr || undefined}
          required={field.required}
        />
      );
    }
    if (field.type === "select" && field.options) {
      return (
        <div className="space-y-2">
          <Label>{field.labelEn}</Label>
          <select
            name={field.key}
            defaultValue={String(getAttr(attrs, field.key, "en"))}
            className="w-full border rounded-md h-10 px-3 text-sm bg-background"
          >
            <option value="">— Select —</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.labelEn}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Label>{field.labelEn}</Label>
        {field.type === "textarea" || field.type === "json" ? (
          <Textarea
            name={field.key}
            defaultValue={String(getAttr(attrs, field.key, "en"))}
            rows={3}
          />
        ) : (
          <Input
            name={field.key}
            defaultValue={String(getAttr(attrs, field.key, "en"))}
            placeholder={field.placeholder}
          />
        )}
      </div>
    );
  }

  return (
    <LocalizedFields
      field={{
        field: field.key,
        label: field.labelEn,
        type: field.type === "textarea" || field.type === "json" ? "textarea" : "text",
        required: field.required,
      }}
      locales={locales}
      defaultLocaleCode={defaultLocaleCode}
      values={{}}
      legacyEntity={attrs}
    />
  );
}

export function ContentItemDetailsSidebar({
  fields,
  item,
  attributes,
  collections,
  contentType,
  locales,
  itemTranslations = [],
  displaySettings,
  onDisplaySettingsChange,
}: Props) {
  const defaultLocale = locales.find((l) => l.isDefault) ?? locales[0];
  const defaultLocaleCode = defaultLocale?.code ?? "en";
  const coreConfig = ENTITY_REGISTRY.ContentItem;

  // Build group map from field definitions
  const groups = fields.reduce<Record<string, ContentFieldDefinition[]>>((acc, field) => {
    const g = field.group ?? "attributes";
    acc[g] = acc[g] ?? [];
    acc[g].push(field);
    return acc;
  }, {});

  // Build sidebar sections: always start with Core, then field groups, then Display settings.
  // Keep IDs unique so custom "display" field groups do not collide with Display settings panel.
  const legacySource = TYPE_TO_LEGACY_SOURCE[contentType.slug];
  const hasDisplaySettingsPanel = Boolean(legacySource && onDisplaySettingsChange);
  const groupSections = Object.keys(groups).map((group) => {
    const isDisplayGroup = group === "display" && hasDisplaySettingsPanel;
    return {
      id: isDisplayGroup ? "display-fields" : group,
      group,
      label: isDisplayGroup
        ? "Display fields"
        : GROUP_LABEL_MAP[group] ?? group.charAt(0).toUpperCase() + group.slice(1),
    };
  });

  const sidebarSections: Array<{ id: string; label: string }> = [
    { id: "core", label: "Core" },
    ...groupSections.map(({ id, label }) => ({ id, label })),
  ];

  if (hasDisplaySettingsPanel) {
    sidebarSections.push({ id: "display-settings", label: "Display" });
  }

  const [activeSection, setActiveSection] = useState(sidebarSections[0]?.id ?? "core");

  return (
    <div className="flex gap-0 min-h-[400px]">
      {/* Left sidebar nav */}
      <nav className="w-36 shrink-0 border-r pr-4 space-y-0.5">
        {sidebarSections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setActiveSection(sec.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              activeSection === sec.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {sec.label}
          </button>
        ))}
      </nav>

      {/* Right content area — all sections rendered, only active one visible */}
      <div className="flex-1 pl-6 min-w-0">
        {/* Core section */}
        <div className={cn("space-y-5", activeSection !== "core" && "hidden")}>
          <input type="hidden" name="contentTypeSlug" value={contentType.slug} />
          {item ? <input type="hidden" name="id" value={item.id} /> : null}

          {coreConfig.fields
            .filter((fieldDef) => !["seoTitle", "seoDescription"].includes(fieldDef.field))
            .map((fieldDef) => (
            <LocalizedFields
              key={fieldDef.field}
              field={fieldDef}
              locales={locales}
              defaultLocaleCode={defaultLocaleCode}
              values={translationsToFieldValues(itemTranslations, fieldDef.field)}
              legacyEntity={item as unknown as Record<string, unknown>}
            />
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                name="slug"
                placeholder="url-segment"
                defaultValue={item?.slug ?? ""}
                pattern={SLUG_INPUT_PATTERN_OPTIONAL}
              />
            </div>
            {collections && collections.length > 0 && (
              <div className="space-y-2">
                <Label>Collection</Label>
                <select
                  name="collectionId"
                  className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                  defaultValue={item?.collectionId ?? ""}
                >
                  <option value="">— None —</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.slug}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic field group sections */}
        {groupSections.map(({ id, group }) => {
          const groupFields = groups[group] ?? [];
          return (
          <div
            key={id}
            className={cn("space-y-5", activeSection !== id && "hidden")}
          >
            <p className="text-xs text-muted-foreground border-b pb-2 mb-4">
              {GROUP_LABEL_MAP[group] ?? group} fields
            </p>
            <div className="grid gap-5">
              {groupFields.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea" || field.type === "json"
                      ? ""
                      : ""
                  }
                >
                  <AttributeField
                    field={field}
                    attrs={attributes}
                    locales={locales}
                    defaultLocaleCode={defaultLocaleCode}
                  />
                </div>
              ))}
            </div>
          </div>
          );
        })}

        {/* Display section */}
        {legacySource && onDisplaySettingsChange && (
          <div className={cn("space-y-5", activeSection !== "display-settings" && "hidden")}>
            <p className="text-xs text-muted-foreground border-b pb-2 mb-4">
              Card display settings
            </p>
            <EntityDisplaySettingsPanel
              source={legacySource}
              value={displaySettings ?? {}}
              onChange={onDisplaySettingsChange}
              showPreview={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
