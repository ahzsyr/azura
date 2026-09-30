import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseCsvLine,
  parseTranslationsCsv,
  parseTranslationsJson,
  rowsToCsv,
} from "@/features/translation/import-parser";
import {
  parseTranslationCellKey,
  translationCellKey,
} from "@/features/translation/translation-grid-types";

describe("parseCsvLine", () => {
  it("parses quoted fields with commas", () => {
    const fields = parseCsvLine('CmsPage,p1,title,ar,"Hello, world",PUBLISHED');
    assert.equal(fields[4], "Hello, world");
    assert.equal(fields[5], "PUBLISHED");
  });

  it("parses escaped quotes", () => {
    const fields = parseCsvLine('CmsPage,p1,title,ar,"Say ""hi""",DRAFT');
    assert.equal(fields[4], 'Say "hi"');
  });
});

describe("parseTranslationsCsv", () => {
  it("parses valid CSV rows", () => {
    const csv = [
      "entityType,entityId,field,localeCode,value,status",
      'CmsPage,page-1,title,ar,"مرحبا",PUBLISHED',
    ].join("\n");

    const result = parseTranslationsCsv(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0].entityType, "CmsPage");
    assert.equal(result.valid[0].localeCode, "ar");
    assert.equal(result.valid[0].status, "PUBLISHED");
  });

  it("rejects unknown entity type", () => {
    const csv = [
      "entityType,entityId,field,localeCode,value,status",
      "NotARealType,id1,title,ar,Hello,PUBLISHED",
    ].join("\n");

    const result = parseTranslationsCsv(csv);
    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, /Unknown entityType/);
  });

  it("rejects unknown field for entity", () => {
    const csv = [
      "entityType,entityId,field,localeCode,value,status",
      "CmsPage,id1,notAField,ar,Hello,PUBLISHED",
    ].join("\n");

    const result = parseTranslationsCsv(csv);
    assert.equal(result.valid.length, 0);
    assert.match(result.errors[0].message, /Unknown field/);
  });

  it("dedupes duplicate keys keeping last", () => {
    const csv = [
      "entityType,entityId,field,localeCode,value,status",
      "CmsPage,id1,title,ar,First,PUBLISHED",
      "CmsPage,id1,title,ar,Second,DRAFT",
    ].join("\n");

    const result = parseTranslationsCsv(csv);
    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0].value, "Second");
    assert.equal(result.valid[0].status, "DRAFT");
  });
});

describe("parseTranslationsJson", () => {
  it("parses valid JSON array", () => {
    const json = JSON.stringify([
      {
        entityType: "Post",
        entityId: "post-1",
        field: "title",
        localeCode: "FR",
        value: "Titre",
        status: "DRAFT",
      },
    ]);

    const result = parseTranslationsJson(json);
    assert.equal(result.errors.length, 0);
    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0].localeCode, "fr");
  });

  it("rejects non-array JSON", () => {
    const result = parseTranslationsJson('{"entityType":"CmsPage"}');
    assert.equal(result.valid.length, 0);
    assert.match(result.errors[0].message, /array/);
  });

  it("rejects invalid JSON", () => {
    const result = parseTranslationsJson("{not json");
    assert.equal(result.valid.length, 0);
    assert.match(result.errors[0].message, /Invalid JSON/);
  });
});

describe("rowsToCsv", () => {
  it("roundtrips through parser", () => {
    const rows = [
      {
        entityType: "CmsPage",
        entityId: "p1",
        field: "title",
        localeCode: "ar",
        value: 'Value with "quotes"',
        status: "PUBLISHED" as const,
      },
    ];
    const csv = rowsToCsv(rows);
    const parsed = parseTranslationsCsv(csv);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.valid[0].value, rows[0].value);
  });
});

describe("translationCellKey", () => {
  it("builds and parses composite keys", () => {
    const key = translationCellKey("CmsPage", "id-1", "title", "AR");
    assert.equal(key, "CmsPage|id-1|title|ar");
    const parsed = parseTranslationCellKey(key);
    assert.deepEqual(parsed, {
      entityType: "CmsPage",
      entityId: "id-1",
      field: "title",
      localeCode: "ar",
    });
  });
});
