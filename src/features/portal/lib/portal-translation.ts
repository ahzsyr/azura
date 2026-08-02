import "server-only";

import type { PublicLocale } from "@/i18n/locale-config";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import {
  loadTranslationBundle,
  type EntityRef,
  type TranslationBundle,
} from "@/features/translation/translation-bundle";
import { getTranslatableFields } from "@/features/translation/entity-registry";
import { translationService } from "@/features/translation/translation.service";
import type { EntityTranslationInput } from "@/features/translation/types";
import {
  legacyShapeFromBundle,
  localizedField,
  legacyShapeFromTranslations,
} from "./portal-translation-shape";

export type { EntityRef, TranslationBundle };
export { localizedField, legacyShapeFromBundle, legacyShapeFromTranslations };

export const loadBundleForRefs = loadTranslationBundle;

type TranslationTx = {
  entityTranslation: {
    upsert: (args: {
      where: {
        entityType_entityId_field_localeCode: {
          entityType: string;
          entityId: string;
          field: string;
          localeCode: string;
        };
      };
      create: {
        entityType: string;
        entityId: string;
        field: string;
        localeCode: string;
        value: string;
        status: "PUBLISHED";
      };
      update: { value: string; status: "PUBLISHED" };
    }) => Promise<unknown>;
  };
};

/** Persist EntityTranslation rows inside a Prisma transaction (demo import, seeds). */
export async function syncLegacyShapeTranslationsTx(
  tx: TranslationTx,
  entityType: string,
  entityId: string,
  shape: Record<string, unknown>,
  mappings: { field: string; enKey: string; arKey: string }[]
): Promise<void> {
  for (const { field, enKey, arKey } of mappings) {
    for (const [localeCode, key] of [
      ["en", enKey],
      ["ar", arKey],
    ] as const) {
      const value = String(shape[key] ?? "").trim();
      if (!value) continue;
      await tx.entityTranslation.upsert({
        where: {
          entityType_entityId_field_localeCode: {
            entityType,
            entityId,
            field,
            localeCode,
          },
        },
        create: {
          entityType,
          entityId,
          field,
          localeCode,
          value,
          status: "PUBLISHED",
        },
        update: { value, status: "PUBLISHED" },
      });
    }
  }
}

/** Persist EntityTranslation rows from nested JSON rows that still use suffixed keys. */
export async function syncLegacyJsonRowTranslations(
  entityType: string,
  entityId: string,
  row: Record<string, unknown>,
  locales: PublicLocale[]
): Promise<void> {
  await syncEntityRowTranslations(entityType, entityId, row, locales);
}

/** Persist EntityTranslation rows from portal child JSON rows (canonical + legacy keys). */
export async function syncEntityRowTranslations(
  entityType: string,
  entityId: string,
  row: Record<string, unknown>,
  locales: PublicLocale[],
  fields?: string[]
): Promise<void> {
  const fieldList = fields ?? getTranslatableFields(entityType).map((f) => f.field);
  const defaultCode = locales.find((l) => l.isDefault)?.code ?? locales[0]?.code ?? "en";
  const inputs: EntityTranslationInput[] = [];

  for (const field of fieldList) {
    for (const locale of locales) {
      const suffix = getContentFieldSuffix(locale.code);
      const legacyKey =
        suffix === "En" || suffix === "Ar" ? `${field}${suffix}` : `${field}_${locale.code}`;
      const modernKey = `${field}_${locale.code}`;

      let value = String(row[modernKey] ?? row[legacyKey] ?? "").trim();
      if (!value && locale.code === defaultCode) {
        const canonical = row[field];
        if (typeof canonical === "string") {
          value = canonical.trim();
        }
      }
      if (!value) continue;
      inputs.push({
        entityType,
        entityId,
        field,
        localeCode: locale.code,
        value,
        status: "PUBLISHED",
      });
    }
  }

  if (inputs.length > 0) {
    await translationService.upsertMany(inputs);
  }
}

export async function loadLegacyEntityShape(
  entityType: string,
  entityId: string,
  fields: string[]
): Promise<Record<string, string>> {
  const bundle = await loadBundleForRefs([{ entityType, entityId }]);
  return legacyShapeFromBundle(bundle, entityType, entityId, fields);
}

export async function hydrateLegacyChildRows(
  entityType: string,
  children: { id: string }[],
  fields: string[]
): Promise<Record<string, string>[]> {
  if (children.length === 0) return [];
  const bundle = await loadBundleForRefs(
    children.map((child) => ({ entityType, entityId: child.id }))
  );
  return children.map((child) => legacyShapeFromBundle(bundle, entityType, child.id, fields));
}
