import type { HeaderBuilderCatalog } from "./types";

const empty: HeaderBuilderCatalog = { pages: [], collections: [], products: [], posts: [] };

export async function loadHeaderCatalogFromServer(
  locale = "en"
): Promise<HeaderBuilderCatalog> {
  const res = await fetch(`/api/admin/header-catalog?locale=${encodeURIComponent(locale)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return empty;
  return (await res.json()) as HeaderBuilderCatalog;
}
