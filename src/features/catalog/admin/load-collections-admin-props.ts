import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Collection } from "@/features/collections/types";

const COLLECTIONS_PATH = resolve(process.cwd(), "src/data/collections.json");

export type CollectionsAdminInitialProps = {
  initialCollections: Collection[];
};

export async function loadCollectionsAdminInitialProps(): Promise<CollectionsAdminInitialProps> {
  try {
    const raw = JSON.parse(await readFile(COLLECTIONS_PATH, "utf-8"));
    const collections = Array.isArray(raw) ? (raw as Collection[]) : [];
    return { initialCollections: collections };
  } catch {
    return { initialCollections: [] };
  }
}
