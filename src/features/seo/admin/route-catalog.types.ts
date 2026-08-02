export type RouteCatalogSource = "wired" | "cms" | "content" | "blog" | "faq";

export type RouteCatalogEntry = {
  path: string;
  label: string;
  source: RouteCatalogSource;
};
