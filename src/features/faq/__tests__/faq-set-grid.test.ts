import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { getLocalizedField } from "@/lib/utils";

/** Mirrors faqSetGridPropsSchema without importing the builder props barrel. */
const faqSetGridPropsSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
  columns: z.coerce
    .number()
    .pipe(z.union([z.literal(2), z.literal(3), z.literal(4)]))
    .default(3),
});

describe("faqSetGrid block schema", () => {
  it("parses faqSetGrid defaults", () => {
    const parsed = faqSetGridPropsSchema.parse({});
    assert.equal(parsed.title, "");
    assert.equal(parsed.subtitle, "");
    assert.equal(parsed.columns, 3);
  });

  it("accepts columns 2, 3, and 4", () => {
    assert.equal(faqSetGridPropsSchema.parse({ columns: 2 }).columns, 2);
    assert.equal(faqSetGridPropsSchema.parse({ columns: 4 }).columns, 4);
  });
});

describe("FAQ set localized title resolution", () => {
  it("reads titleEn via includeLegacySuffixFields", () => {
    const set = {
      id: "1",
      slug: "general",
      titleEn: "General Questions",
      titleAr: "أسئلة عامة",
      excerptEn: null,
      excerptAr: null,
      descriptionEn: "",
      descriptionAr: "",
      coverUrl: null,
      itemCount: 3,
    };
    assert.equal(
      getLocalizedField(set, "title", "en", { includeLegacySuffixFields: true }),
      "General Questions",
    );
    assert.equal(getLocalizedField(set, "title", "en"), "");
  });
});
