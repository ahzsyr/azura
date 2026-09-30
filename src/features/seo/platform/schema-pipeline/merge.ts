import type { SchemaNode } from "./types";

/** Concatenate builder outputs only — no mutation or overwrite. */
export function merge(nodeLists: SchemaNode[][]): SchemaNode[] {
  return nodeLists.flat();
}
