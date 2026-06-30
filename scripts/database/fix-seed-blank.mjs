#!/usr/bin/env node
/**
 * Align database/mysql/02-seed-blank.sql with post–migration-11 schema.
 * Strips legacy *En/*Ar columns and emits EntityTranslation rows where needed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SEED_PATH = join(ROOT, "database", "mysql", "02-seed-blank.sql");

function escSql(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function etRow(id, entityType, entityId, field, localeCode, value, ts) {
  return (
    `INSERT INTO \`EntityTranslation\` (\`id\`, \`entityType\`, \`entityId\`, \`field\`, \`localeCode\`, \`value\`, \`version\`, \`status\`, \`createdAt\`, \`updatedAt\`) ` +
    `VALUES ('${id}', '${entityType}', '${entityId}', '${field}', '${localeCode}', '${escSql(value)}', 1, 'PUBLISHED', '${ts}', '${ts}');`
  );
}

function parseQuotedStrings(valuesPart) {
  const out = [];
  let i = 0;
  while (i < valuesPart.length) {
    while (i < valuesPart.length && (valuesPart[i] === " " || valuesPart[i] === ",")) i++;
    if (i >= valuesPart.length) break;
    if (valuesPart[i] === "'") {
      i++;
      let s = "";
      while (i < valuesPart.length) {
        if (valuesPart[i] === "\\") {
          s += valuesPart[i + 1] ?? "";
          i += 2;
        } else if (valuesPart[i] === "'") {
          i++;
          break;
        } else {
          s += valuesPart[i++];
        }
      }
      out.push(s);
    } else {
      const m = valuesPart.slice(i).match(/^([^,]+)/);
      if (!m) break;
      out.push(m[1].trim());
      i += m[1].length;
    }
  }
  return out;
}

function fixContentTypeLine(line, entityTranslations, etCounter) {
  const prefix = "INSERT INTO `ContentType` (";
  if (!line.startsWith(prefix)) return line;

  const colsMatch = line.match(/^INSERT INTO `ContentType` \(([^)]+)\) VALUES \((.+)\);$/);
  if (!colsMatch) return line;

  const values = parseQuotedStrings(colsMatch[2]);
  if (values.length < 10) return line;

  const [id, slug, nameEn, nameAr, labelSingularEn, labelSingularAr, labelPluralEn, labelPluralAr, icon, ...rest] =
    values;
  const createdAt = rest[rest.length - 2];
  const ts = createdAt.replace(/^'|'$/g, "") || "2026-06-01 13:36:59.246";

  const fields = [
    ["name", nameEn, nameAr],
    ["labelSingular", labelSingularEn, labelSingularAr],
    ["labelPlural", labelPluralEn, labelPluralAr],
  ];
  for (const [field, en, ar] of fields) {
    if (en) {
      entityTranslations.push(etRow(`seed-et-${++etCounter.n}`, "ContentType", id, field, "en", en, ts));
    }
    if (ar) {
      entityTranslations.push(etRow(`seed-et-${++etCounter.n}`, "ContentType", id, field, "ar", ar, ts));
    }
  }

  const restSql = rest.map((v) => (v === "NULL" || v === "1" || v === "0" || /^\d+$/.test(v) ? v : `'${escSql(v)}'`)).join(", ");
  return (
    `INSERT INTO \`ContentType\` (\`id\`, \`slug\`, \`icon\`, \`routePrefix\`, \`fieldSchema\`, \`displaySchema\`, \`adminConfig\`, \`sortOrder\`, \`isEnabled\`, \`createdAt\`, \`updatedAt\`) ` +
    `VALUES ('${id}', '${slug}', '${icon}', ${restSql});`
  );
}

function fixMediaAssetLine(line, entityTranslations, etCounter) {
  if (!line.startsWith("INSERT INTO `MediaAsset`")) return line;

  line = line.replace("`altEn`, `altAr`, ", "");

  const m = line.match(
    /^INSERT INTO `MediaAsset` \(([^)]+)\) VALUES \('([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', (\d+), (NULL|\d+), (NULL|\d+), '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)', (NULL|'[^']*'), (NULL|'[^']*'), '([^']+)', '([^']+)'\);$/,
  );
  if (!m) {
    return line.replace(/, '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)', NULL, NULL,/g, ", NULL, NULL,");
  }

  const [, , id, filename, url, mimeType, mediaType, sizeBytes, width, height, altEn, altAr, folderId, uploadedById, createdAt, updatedAt] =
    m;
  const ts = createdAt;
  if (altEn) entityTranslations.push(etRow(`seed-et-${++etCounter.n}`, "MediaAsset", id, "alt", "en", altEn, ts));
  if (altAr) entityTranslations.push(etRow(`seed-et-${++etCounter.n}`, "MediaAsset", id, "alt", "ar", altAr, ts));

  return (
    `INSERT INTO \`MediaAsset\` (\`id\`, \`filename\`, \`url\`, \`mimeType\`, \`mediaType\`, \`sizeBytes\`, \`width\`, \`height\`, \`folderId\`, \`uploadedById\`, \`createdAt\`, \`updatedAt\`) ` +
    `VALUES ('${id}', '${filename}', '${url}', '${mimeType}', '${mediaType}', ${sizeBytes}, ${width}, ${height}, ${folderId}, ${uploadedById}, '${createdAt}', '${updatedAt}');`
  );
}

function main() {
  const raw = readFileSync(SEED_PATH, "utf-8");
  const entityTranslations = [];
  const etCounter = { n: 0 };

  const out = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("INSERT INTO `CmsPage`")) {
      out.push(
        line
          .replace("`titleEn`, `titleAr`, `excerptEn`, `excerptAr`, ", "")
          .replace(
            /(VALUES \('[^']+', '[^']+'), '', '', '', '', ('[^']+')/,
            "$1, $2",
          ),
      );
      continue;
    }
    if (line.startsWith("INSERT INTO `CompanyInfo`")) {
      out.push(
        "INSERT INTO `CompanyInfo` (`id`, `name`, `registrationNo`, `licenseInfo`, `phone`, `whatsapp`, `email`, `socialLinks`, `trustBadges`, `updatedAt`) VALUES ('default', 'AZURA solution', '', '', '', '', 'info@azura.com', '{}', '[]', '2026-06-05 11:01:39.398');",
      );
      continue;
    }
    if (line.startsWith("INSERT INTO `ContentType`")) {
      out.push(fixContentTypeLine(line, entityTranslations, etCounter));
      continue;
    }
    if (line.startsWith("INSERT INTO `Custom404`")) {
      out.push(
        line
          .replace("`titleEn`, `titleAr`, `bodyEn`, `bodyAr`, ", "")
          .replace(/, '', '', '', '', /g, ", "),
      );
      continue;
    }
    if (line.startsWith("INSERT INTO `MediaAsset`")) {
      out.push(fixMediaAssetLine(line, entityTranslations, etCounter));
      continue;
    }
    if (line.startsWith("INSERT INTO `SiteTheme`")) {
      out.push(
        line
          .replace("`preset`, `primaryColor`", "`preset`, `siteDefaultPresetId`, `primaryColor`")
          .replace(
            ", `textEffectEnabled`)",
            ", `textEffectEnabled`, `themeProvenance`, `backgroundEffectSettings`)",
          )
          .replace("VALUES ('published', 'CUSTOM',", "VALUES ('published', 'CUSTOM', 'travel',")
          .replace("VALUES ('draft', 'CUSTOM',", "VALUES ('draft', 'CUSTOM', 'travel',")
          .replace(/, 1, 1\);$/, ", 1, 1, '{}', '{}');"),
      );
      continue;
    }
    if (line.startsWith("INSERT INTO `TranslationJob`")) {
      out.push(line.replace("`languageCode`", "`localeCode`"));
      continue;
    }
    out.push(line);
  }

  const insertAt = out.findIndex((l) => l.startsWith("-- LocaleConfig"));
  if (insertAt >= 0 && entityTranslations.length > 0) {
    out.splice(
      insertAt,
      0,
      `-- EntityTranslation (${entityTranslations.length} rows)`,
      ...entityTranslations,
      "",
    );
  }

  writeFileSync(SEED_PATH, out.join("\n"));
  console.log(`Updated ${SEED_PATH}`);
  console.log(`  EntityTranslation rows added: ${entityTranslations.length}`);
}

main();
