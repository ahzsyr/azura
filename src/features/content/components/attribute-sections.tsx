"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/marketing/section";
import type { ContentFieldDefinition } from "@/features/content/types";
import { formatPrice, getLocalizedField, type LocalizedFieldOptions } from "@/lib/utils";

type Props = {
  locale: string;
  fields: ContentFieldDefinition[];
  attributes: Record<string, unknown>;
  fieldOpts?: LocalizedFieldOptions;
};

function fieldLabel(
  field: ContentFieldDefinition,
  locale: string,
  fieldOpts?: LocalizedFieldOptions
) {
  return getLocalizedField(field as Record<string, unknown>, "label", locale, fieldOpts);
}

function attrValue(
  field: ContentFieldDefinition,
  attributes: Record<string, unknown>,
  locale: string,
  fieldOpts?: LocalizedFieldOptions
): unknown {
  if (field.localized) {
    return getLocalizedField(attributes, field.key, locale, fieldOpts);
  }
  return attributes[field.key];
}

function formatValue(
  field: ContentFieldDefinition,
  value: unknown,
  locale: string,
  attributes: Record<string, unknown>,
  t: ReturnType<typeof useTranslations<"common">>
): ReactNode {
  if (value == null || value === "") return null;

  switch (field.type) {
    case "price": {
      const currency = (attributes.currency as string) ?? "USD";
      return formatPrice(Number(value), currency, locale);
    }
    case "boolean":
      return value ? t("yes") : t("no");
    case "json": {
      if (Array.isArray(value)) {
        if (value.length === 0) return null;
        if (typeof value[0] === "string") {
          return (
            <ul className="grid gap-2 md:grid-cols-2">
              {value.map((item) => (
                <li key={String(item)} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {String(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (typeof value[0] === "object" && value[0] !== null && "day" in (value[0] as object)) {
          return (
            <div className="space-y-4">
              {(value as Array<{ day: number; title: string; desc: string }>).map((day) => (
                <div key={day.day} className="rounded-xl border p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {t("day")} {day.day}
                  </span>
                  <h3 className="mt-1 font-medium">{day.title}</h3>
                  {day.desc ? <p className="mt-2 text-sm text-muted-foreground">{day.desc}</p> : null}
                </div>
              ))}
            </div>
          );
        }
        return (
          <ul className="space-y-1 text-sm">
            {value.map((item, i) => (
              <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
            ))}
          </ul>
        );
      }
      return <pre className="text-sm">{JSON.stringify(value, null, 2)}</pre>;
    }
    case "url":
      return (
        <a href={String(value)} className="text-primary underline" target="_blank" rel="noopener noreferrer">
          {String(value)}
        </a>
      );
    default:
      return String(value);
  }
}

const GROUP_ORDER = ["pricing", "location", "details", "display", "cta", "general"];

export function AttributeSections({ locale, fields, attributes, fieldOpts }: Props) {
  const t = useTranslations("common");
  const groups = new Map<string, ContentFieldDefinition[]>();
  for (const field of fields) {
    const group = field.group ?? "general";
    const list = groups.get(group) ?? [];
    list.push(field);
    groups.set(group, list);
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    const ai = GROUP_ORDER.indexOf(a);
    const bi = GROUP_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const sections = orderedGroups
    .map(([group, groupFields]) => {
      const rows = groupFields
        .map((field) => {
          const value = attrValue(field, attributes, locale, fieldOpts);
          const rendered = formatValue(field, value, locale, attributes, t);
          if (rendered == null) return null;
          return { field, rendered };
        })
        .filter(Boolean) as { field: ContentFieldDefinition; rendered: ReactNode }[];

      if (rows.length === 0) return null;
      return { group, rows };
    })
    .filter(Boolean) as { group: string; rows: { field: ContentFieldDefinition; rendered: ReactNode }[] }[];

  if (sections.length === 0) return null;

  return (
    <div className="space-y-10">
      {sections.map(({ group, rows }) => (
        <div key={group}>
          {group !== "general" ? (
            <SectionHeader
              title={group.charAt(0).toUpperCase() + group.slice(1).replace(/-/g, " ")}
              align="start"
            />
          ) : null}
          <div className={group === "general" ? "space-y-6" : "mt-4 space-y-6"}>
            {rows.map(({ field, rendered }) => (
              <div key={field.key}>
                {field.type !== "json" ||
                !Array.isArray(attrValue(field, attributes, locale, fieldOpts)) ? (
                  <h3 className="mb-2 font-medium">{fieldLabel(field, locale, fieldOpts)}</h3>
                ) : null}
                <div className="text-muted-foreground">{rendered}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
