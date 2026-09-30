#!/usr/bin/env node
/**
 * Split monolithic prisma/schema.prisma into domain files (move-only).
 * Run: node scripts/prisma/split-schema.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaDir = path.join(root, "prisma");
const schemaDir = path.join(prismaDir, "schema");

const MARKERS = [
  { name: "platform.prisma", marker: "// --- Platform upgrade models ---" },
  { name: "entities.prisma", marker: "// --- Generic content platform (industry-agnostic catalog) ---" },
  { name: "i18n.prisma", marker: "// --- Scalable i18n translation layer ---" },
  { name: "forms.prisma", marker: "// --- Conversion & forms platform ---" },
  { name: "portal.prisma", marker: "// --- Portal & support platform ---" },
];

function splitSchema(content) {
  const lines = content.split(/\r?\n/);
  let headerEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("enum ") || lines[i].startsWith("model ")) {
      headerEnd = i;
      break;
    }
  }

  const header = lines.slice(0, headerEnd).join("\n");
  const body = lines.slice(headerEnd);

  const enumLines = [];
  const coreLines = [];
  let i = 0;
  while (i < body.length && (body[i].startsWith("enum ") || body[i] === "" || body[i].startsWith("//"))) {
    if (body[i].startsWith("enum ")) {
      const block = [body[i]];
      i++;
      while (i < body.length && body[i] !== "}") {
        block.push(body[i]);
        i++;
      }
      if (i < body.length) block.push(body[i]);
      i++;
      enumLines.push(...block, "");
      continue;
    }
    i++;
  }

  while (i < body.length && body[i].trim() === "") i++;

  const markerIndices = MARKERS.map(({ marker }) => {
    const idx = body.findIndex((line) => line === marker);
    return { marker, idx };
  });

  const firstMarkerIdx = markerIndices.find((m) => m.idx >= 0)?.idx ?? body.length;
  coreLines.push(...body.slice(i, firstMarkerIdx));

  const files = new Map();
  files.set("enums.prisma", `// Domain: shared enums\n\n${enumLines.join("\n").trim()}\n`);
  files.set("core.prisma", `// Domain: core travel CMS models\n\n${coreLines.join("\n").trim()}\n`);

  for (let m = 0; m < MARKERS.length; m++) {
    const { name, marker } = MARKERS[m];
    const start = body.findIndex((line) => line === marker);
    if (start < 0) continue;
    const end =
      m + 1 < MARKERS.length
        ? body.findIndex((line) => line === MARKERS[m + 1].marker)
        : body.length;
    const slice = body.slice(start, end >= 0 ? end : body.length).join("\n").trim();
    files.set(name, `// ${marker}\n\n${slice}\n`);
  }

  return { header, files };
}

function buildBaseHeader(header, provider) {
  return `${header.replace(
    /generator client \{[\s\S]*?\}/,
    `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}`,
  ).replace(/provider = "mysql"/, `provider = "${provider}"`)}
`;
}

function processVariant(schemaFile, provider) {
  const content = fs.readFileSync(schemaFile, "utf8");
  const { header, files } = splitSchema(content);
  const variantDir = path.join(schemaDir, provider === "postgresql" ? "postgresql" : "mysql");

  fs.mkdirSync(variantDir, { recursive: true });
  fs.writeFileSync(
    path.join(variantDir, "schema.prisma"),
    buildBaseHeader(header, provider),
  );
  for (const [name, body] of files) {
    fs.writeFileSync(path.join(variantDir, name), body);
  }
  console.log(`[split-schema] Wrote ${files.size + 1} files to prisma/schema/${provider === "postgresql" ? "postgresql" : "mysql"}/`);
}

fs.mkdirSync(schemaDir, { recursive: true });
processVariant(path.join(prismaDir, "schema.prisma"), "mysql");
if (fs.existsSync(path.join(prismaDir, "schema.postgresql.prisma"))) {
  processVariant(path.join(prismaDir, "schema.postgresql.prisma"), "postgresql");
}

// Root shims point generators at domain folders
fs.writeFileSync(
  path.join(prismaDir, "schema.prisma"),
  `// AZURA — Prisma schema entry (MySQL). Domain models live in prisma/schema/mysql/.
// Migrations: prisma/migrations/ (unchanged)

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
`,
);

fs.writeFileSync(
  path.join(prismaDir, "schema.postgresql.prisma"),
  `// AZURA — Prisma schema entry (PostgreSQL). Domain models live in prisma/schema/postgresql/.

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`,
);

console.log("[split-schema] Updated root schema entry files.");
