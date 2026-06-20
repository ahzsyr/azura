"use client";

import type { ContentFieldDefinition } from "@/features/content/types";
import type { ContentCollection, ContentItem, ContentType } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import { LocalizedFields } from "@/features/translation/components/localized-fields";
import type { EntityTranslation } from "@prisma/client";
import { ENTITY_REGISTRY } from "@/features/translation/entity-registry";
import { translationsToFieldValues } from "@/features/translation/block-translation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-shell";
import { PriceFieldInput } from "@/features/content/admin/price-field-input";

type Props = {
  fields: ContentFieldDefinition[];
  item?: ContentItem;
  attributes: Record<string, unknown>;
  collections?: ContentCollection[];
  contentType: ContentType;
  locales: PublicLocale[];
  itemTranslations?: EntityTranslation[];
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

function LocalizedAttributeField({
  field,
  attrs,
  locales,
  defaultLocaleCode,
}: {
  field: ContentFieldDefinition;
  attrs: Record<string, unknown>;
  locales: PublicLocale[];
  defaultLocaleCode: string;
}) {
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
    return (
      <div className="space-y-2">
        <Label>{field.labelEn}</Label>
        {field.type === "textarea" ? (
          <Textarea name={field.key} defaultValue={String(getAttr(attrs, field.key, "en"))} rows={3} />
        ) : (
          <Input name={field.key} defaultValue={String(getAttr(attrs, field.key, "en"))} />
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

export function ContentItemFormFields({
  fields,
  item,
  attributes,
  collections,
  contentType,
  locales,
  itemTranslations = [],
}: Props) {
  const defaultLocale = locales.find((l) => l.isDefault) ?? locales[0];
  const coreConfig = ENTITY_REGISTRY.ContentItem;

  const groups = fields.reduce<Record<string, ContentFieldDefinition[]>>((acc, field) => {
    const g = field.group ?? "attributes";
    acc[g] = acc[g] ?? [];
    acc[g].push(field);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <input type="hidden" name="contentTypeSlug" value={contentType.slug} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <AdminCollapsibleSection title="Core" defaultOpen>
        <div className="grid gap-6">
          {coreConfig.fields.map((fieldDef) => (
            <LocalizedFields
              key={fieldDef.field}
              field={fieldDef}
              locales={locales}
              defaultLocaleCode={defaultLocale?.code ?? "en"}
              values={translationsToFieldValues(itemTranslations, fieldDef.field)}
              legacyEntity={item as unknown as Record<string, unknown>}
            />
          ))}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                name="slug"
                placeholder="url-segment"
                defaultValue={item?.slug ?? ""}
                pattern="[a-z0-9-]*"
              />
            </div>
            {collections && collections.length > 0 ? (
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
            ) : null}
          </div>
        </div>
      </AdminCollapsibleSection>

      {Object.entries(groups).map(([group, groupFields]) => (
        <AdminCollapsibleSection
          key={group}
          title={group.charAt(0).toUpperCase() + group.slice(1)}
          defaultOpen={group === "pricing" || group === "attributes"}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {groupFields.map((field) => (
              <div
                key={field.key}
                className={field.type === "textarea" || field.type === "json" ? "md:col-span-2" : ""}
              >
                <LocalizedAttributeField
                  field={field}
                  attrs={attributes}
                  locales={locales}
                  defaultLocaleCode={defaultLocale?.code ?? "en"}
                />
              </div>
            ))}
          </div>
        </AdminCollapsibleSection>
      ))}
    </div>
  );
}
