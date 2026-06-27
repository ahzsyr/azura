import test from "node:test";
import assert from "node:assert/strict";
import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { applyResolvedBlockCopyToProps } from "@/features/translation/block-translation";

const LOCALES: PublicLocale[] = [
  {
    code: "en",
    urlPrefix: "en",
    label: "English",
    htmlLang: "en",
    dir: "ltr",
    flag: "us",
    isDefault: true,
  },
  {
    code: "ar",
    urlPrefix: "ar",
    label: "Arabic",
    htmlLang: "ar",
    dir: "rtl",
    flag: "sa",
    isDefault: false,
  },
];

function row(field: string, localeCode: string, value: string): EntityTranslation {
  return {
    id: `${field}:${localeCode}`,
    entityType: "BuilderBlock",
    entityId: "block-entity-1",
    field,
    localeCode,
    value,
    status: "PUBLISHED",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("applyResolvedBlockCopyToProps merges EntityTranslation values into base fields", () => {
  const props = { title: "Old title", limit: 12 };
  const resolved = applyResolvedBlockCopyToProps(props, "productGrid", {
    locale: "ar",
    enabledLocales: LOCALES,
    translations: [row("title", "ar", "عنوان محدث")],
  });

  assert.equal(resolved.title, "عنوان محدث");
  assert.equal(resolved.limit, 12);
});

test("applyResolvedBlockCopyToProps reads legacy suffixed fields for delegated renderers", () => {
  const props = { titleEn: "Updated English title", subtitleEn: "Updated subtitle" };
  const resolved = applyResolvedBlockCopyToProps(props, "searchBlock", {
    locale: "en",
    enabledLocales: LOCALES,
  });

  assert.equal(resolved.title, "Updated English title");
  assert.equal(resolved.subtitle, "Updated subtitle");
});

test("applyResolvedBlockCopyToProps merges conversion block message fields", () => {
  const props = { messageEn: "Ready?", messageAr: "هل أنت مستعد؟" };
  const resolved = applyResolvedBlockCopyToProps(props, "stickyCta", {
    locale: "ar",
    enabledLocales: LOCALES,
  });

  assert.equal(resolved.message, "هل أنت مستعد؟");
});

test("applyResolvedBlockCopyToProps merges successMessage for download gate", () => {
  const props = { successMessageId: "Unduhan terbuka." };
  const resolved = applyResolvedBlockCopyToProps(props, "downloadGate", {
    locale: "id",
    enabledLocales: [
      ...LOCALES,
      {
        code: "id",
        urlPrefix: "id",
        label: "Indonesian",
        htmlLang: "id",
        dir: "ltr",
        flag: "id",
        isDefault: false,
      },
    ],
  });

  assert.equal(resolved.successMessage, "Unduhan terbuka.");
});
