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

test("applyResolvedBlockCopyToProps merges contact form hero and section copy", () => {
  const props = { title: "Send a message" };
  const resolved = applyResolvedBlockCopyToProps(props, "contactFormBuilder", {
    locale: "en",
    enabledLocales: LOCALES,
    translations: [
      row("heroTitle", "en", "We'll get back to you as soon as possible"),
      row("formSectionTitle", "en", "Your details"),
      row("heroDescription", "en", "Tell us what you need."),
    ],
  });

  assert.equal(resolved.heroTitle, "We'll get back to you as soon as possible");
  assert.equal(resolved.formSectionTitle, "Your details");
  assert.equal(resolved.heroDescription, "Tell us what you need.");
  assert.equal(resolved.title, "Send a message");
});

test("applyResolvedBlockCopyToProps writes empty string when translation cleared", () => {
  const cleared = applyResolvedBlockCopyToProps(
    { title: "", heroTitle: "", successMessage: "" },
    "contactFormBuilder",
    { locale: "en", enabledLocales: LOCALES, translations: [] },
  );
  assert.equal(cleared.title, "");
  assert.equal(cleared.heroTitle, "");
  assert.equal(cleared.successMessage, "");
});

test("overrideMapToInputs includes empty clears", async () => {
  const {
    buildTranslationOverrideKey,
    overrideMapToInputs,
  } = await import("@/features/translation/block-translation");
  const map = new Map<string, string>();
  map.set(buildTranslationOverrideKey("page:1:block-1", "title", "en"), "");
  map.set(buildTranslationOverrideKey("page:1:block-1", "heroTitle", "en"), "Keep me");
  const inputs = overrideMapToInputs(map);
  assert.equal(inputs.length, 2);
  const title = inputs.find((i) => i.field === "title");
  const hero = inputs.find((i) => i.field === "heroTitle");
  assert.equal(title?.value, "");
  assert.equal(hero?.value, "Keep me");
});

test("mergeBlockTranslationInputs drops cleared fields so sync can delete stale rows", async () => {
  const { mergeBlockTranslationInputs } = await import("@/features/translation/block-translation");
  const fromProps = [
    {
      entityType: "BuilderBlock" as const,
      entityId: "page:1:block-1",
      field: "heroTitle",
      localeCode: "en",
      value: "Old hero",
      status: "PUBLISHED" as const,
    },
  ];
  const fromForm = [
    {
      entityType: "BuilderBlock" as const,
      entityId: "page:1:block-1",
      field: "heroTitle",
      localeCode: "en",
      value: "",
      status: "PUBLISHED" as const,
    },
  ];
  const merged = mergeBlockTranslationInputs(fromProps, fromForm);
  assert.equal(merged.length, 0);
});

test("getLocalizedField reads contact form heroTitle from EntityTranslation like loc()", async () => {
  const { getLocalizedField } = await import("@/lib/utils");
  const value = getLocalizedField({}, "heroTitle", "en", {
    enabledLocales: LOCALES,
    translations: [row("heroTitle", "en", "We'll get back to you as soon as possible")],
    includeLegacySuffixFields: true,
  });
  assert.equal(value, "We'll get back to you as soon as possible");
});
