import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import type { SchemaGraph } from "../types";

const SNAPSHOT_DIR = path.join(__dirname, "snapshots");

export function assertGraphSnapshot(name: string, graph: SchemaGraph) {
  const file = path.join(SNAPSHOT_DIR, `${name}.json`);
  const json = `${JSON.stringify(graph, null, 2)}\n`;
  if (process.env.UPDATE_SNAPSHOTS === "1") {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    fs.writeFileSync(file, json, "utf8");
  }
  const expected = fs.readFileSync(file, "utf8");
  assert.equal(json, expected);
}
