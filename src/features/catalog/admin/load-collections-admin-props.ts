import "server-only";

import type { Collection } from "@/features/collections/types";
import { loadCollections } from "@/features/collections/collections-persistence";

export type CollectionsAdminInitialProps = {
  initialCollections: Collection[];
};

export async function loadCollectionsAdminInitialProps(): Promise<CollectionsAdminInitialProps> {
  const collections = await loadCollections();
  return { initialCollections: collections };
}
