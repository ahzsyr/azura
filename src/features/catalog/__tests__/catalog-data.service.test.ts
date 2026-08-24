import assert from "node:assert/strict";
import test from "node:test";
import { getLocalizedField } from "@/lib/utils";
import type { CatalogCardData } from "@/features/catalog/types";

const localized = { includeLegacySuffixFields: true as const };

test("catalog card resolves name from legacy suffixed fields", () => {
  const item: CatalogCardData = {
    id: "1",
    source: "packages",
    slug: "umrah-package",
    nameEn: "Umrah Package",
    nameAr: "باقة عمرة",
    excerptEn: "7-day package",
    price: 1200,
    currency: "USD",
    duration: 7,
    imageUrl: "/media/package.jpg",
    images: [{ url: "/media/package.jpg" }],
  };

  assert.equal(getLocalizedField(item, "name", "en", localized), "Umrah Package");
  assert.equal(getLocalizedField(item, "name", "ar", localized), "باقة عمرة");
  assert.equal(getLocalizedField(item, "excerpt", "en", localized), "7-day package");
});

test("catalog card name is empty without legacy suffix resolution", () => {
  const item: CatalogCardData = {
    id: "1",
    source: "packages",
    nameEn: "Umrah Package",
    nameAr: "باقة عمرة",
    images: [],
  };

  assert.equal(getLocalizedField(item, "name", "en"), "");
});
