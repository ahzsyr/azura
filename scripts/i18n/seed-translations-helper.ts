import type { PrismaClient } from "@prisma/client";

export type LegacyFieldMapping = {
  field: string;
  enKey: string;
  arKey: string;
};

export async function seedEntityTranslations(
  prisma: PrismaClient,
  entityType: string,
  entityId: string,
  shape: Record<string, unknown>,
  mappings: LegacyFieldMapping[]
): Promise<void> {
  for (const { field, enKey, arKey } of mappings) {
    for (const [localeCode, key] of [
      ["en", enKey],
      ["ar", arKey],
    ] as const) {
      const value = String(shape[key] ?? "").trim();
      if (!value) continue;
      await prisma.entityTranslation.upsert({
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

export async function seedBilingualFields(
  prisma: PrismaClient,
  entityType: string,
  entityId: string,
  values: Record<string, { en?: string; ar?: string }>
): Promise<void> {
  const shape: Record<string, unknown> = {};
  const mappings: LegacyFieldMapping[] = [];

  for (const [field, locales] of Object.entries(values)) {
    const enKey = `${field}En`;
    const arKey = `${field}Ar`;
    shape[enKey] = locales.en ?? "";
    shape[arKey] = locales.ar ?? "";
    mappings.push({ field, enKey, arKey });
  }

  await seedEntityTranslations(prisma, entityType, entityId, shape, mappings);
}
