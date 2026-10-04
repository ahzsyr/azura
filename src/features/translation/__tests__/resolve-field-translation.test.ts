import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import {
  resolveFieldTranslation,
  resolveSlugWithLocaleContract,
} from "@/features/translation/resolve-field-translation";

const locales: PublicLocale[] = [
  {
    code: "en",
    urlPrefix: "en",
    label: "English",
    htmlLang: "en",
    dir: "ltr",
    flag: "🇺🇸",
    isDefault: true,
  },
  {
    code: "fr",
    urlPrefix: "fr",
    label: "French",
    htmlLang: "fr",
    dir: "ltr",
    flag: "🇫🇷",
    isDefault: false,
  },
  {
    code: "fr-CA",
    urlPrefix: "fr-ca",
    label: "French (Canada)",
    htmlLang: "fr-CA",
    dir: "ltr",
    flag: "🇨🇦",
    isDefault: false,
  },
];

function row(
  field: string,
  localeCode: string,
  value: string,
  status: "PUBLISHED" | "DRAFT" = "PUBLISHED",
): EntityTranslation {
  return {
    id: `${field}-${localeCode}`,
    entityType: "CmsPage",
    entityId: "p1",
    field,
    localeCode,
    value,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EntityTranslation;
}

describe("resolveFieldTranslation admin/public contract", () => {
  it("admin returns exact locale or null (no cross-locale fill)", () => {
    const translations = [row("title", "en", "Hello"), row("title", "fr", "Bonjour")];
    assert.equal(
      resolveFieldTranslation({
        field: "title",
        requestedLocale: "fr-CA",
        isAdmin: true,
        translations,
        enabledLocales: locales,
      }),
      null,
    );
    assert.equal(
      resolveFieldTranslation({
        field: "title",
        requestedLocale: "fr",
        isAdmin: true,
        translations,
        enabledLocales: locales,
      }),
      "Bonjour",
    );
  });

  it("public walks fr-CA → fr → en", () => {
    const translations = [row("title", "en", "Hello"), row("title", "fr", "Bonjour")];
    assert.equal(
      resolveFieldTranslation({
        field: "title",
        requestedLocale: "fr-CA",
        isAdmin: false,
        translations,
        enabledLocales: locales,
        defaultCode: "en",
      }),
      "Bonjour",
    );
  });

  it("public falls through to default when base missing", () => {
    const translations = [row("title", "en", "Hello")];
    assert.equal(
      resolveFieldTranslation({
        field: "title",
        requestedLocale: "fr-CA",
        isAdmin: false,
        translations,
        enabledLocales: locales,
        defaultCode: "en",
      }),
      "Hello",
    );
  });
});

describe("resolveSlugWithLocaleContract", () => {
  it("public slug resolution uses candidate chain", () => {
    const slugs = { fr: "accueil", en: "home" };
    assert.equal(
      resolveSlugWithLocaleContract({
        slugs,
        requestedLocale: "fr-CA",
        enabledLocales: locales,
        defaultCode: "en",
        isAdmin: false,
      }),
      "accueil",
    );
  });

  it("admin slug resolution is exact only", () => {
    const slugs = { fr: "accueil", en: "home" };
    assert.equal(
      resolveSlugWithLocaleContract({
        slugs,
        requestedLocale: "fr-CA",
        enabledLocales: locales,
        defaultCode: "en",
        isAdmin: true,
        fallbackSlug: "canonical",
      }),
      "canonical",
    );
  });
});
