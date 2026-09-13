import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildBrtNetworkingExportDocument } from "../../src/features/collections/brt-networking-hierarchy";

const outPath = resolve("src/data/collections/brt-networking-hierarchy.json");
const doc = buildBrtNetworkingExportDocument();

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, "utf-8");
console.log(`Wrote ${doc.collectionCount} collections to ${outPath}`);
