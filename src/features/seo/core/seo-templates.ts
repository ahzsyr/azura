export type SeoTemplateContext = {
  title?: string;
  postname?: string;
  sitename?: string;
  sep?: string;
  tagline?: string;
  excerpt?: string;
  page?: string;
  category?: string;
  brand?: string;
  author?: string;
  termTitle?: string;
  date?: string;
  searchPhrase?: string;
};

export type SeoTemplateType =
  | "home"
  | "page"
  | "product"
  | "post"
  | "category"
  | "brand"
  | "tag"
  | "author"
  | "search"
  | "404";

export const DEFAULT_SEO_TEMPLATES: Record<SeoTemplateType, string> = {
  home: "%%sitename%% %%page%% %%sep%% %%tagline%%",
  page: "%%postname%% %%page%% %%sep%% %%sitename%%",
  product: "%%title%% %%sep%% %%sitename%%",
  post: "%%postname%% %%sep%% %%sitename%%",
  category: "%%term_title%% archive %%page%% %%sep%% %%sitename%%",
  brand: "%%term_title%% archive %%page%% %%sep%% %%sitename%%",
  tag: "%%term_title%% archive %%page%% %%sep%% %%sitename%%",
  author: "%%term_title%% archive %%page%% %%sep%% %%sitename%%",
  search: "You searched for %%search_phrase%% %%page%% %%sep%% %%sitename%%",
  "404": "Page not found %%sep%% %%sitename%%",
};

const VARIABLE_MAP: Record<string, keyof SeoTemplateContext> = {
  "%%title%%": "title",
  "%%postname%%": "postname",
  "%%sitename%%": "sitename",
  "%%sep%%": "sep",
  "%%tagline%%": "tagline",
  "%%excerpt%%": "excerpt",
  "%%page%%": "page",
  "%%category%%": "category",
  "%%brand%%": "brand",
  "%%author%%": "author",
  "%%term_title%%": "termTitle",
  "%%date%%": "date",
  "%%search_phrase%%": "searchPhrase",
};

export function resolveSeoTemplate(template: string, context: SeoTemplateContext): string {
  let result = template;
  for (const [token, key] of Object.entries(VARIABLE_MAP)) {
    const value = context[key];
    if (value !== undefined && value !== "") {
      result = result.split(token).join(value);
    } else {
      result = result.split(token).join("");
    }
  }
  return result.replace(/\s+/g, " ").replace(/\s+\|\s*$/g, "").trim();
}

export function resolveTemplateTypeFromPageType(pageType: string, pageKey?: string): SeoTemplateType {
  if (pageKey === "home") return "home";
  if (pageType === "search" || pageKey === "search") return "search";
  if (pageType === "product") return "product";
  if (pageType === "blog") return "post";
  if (pageType === "collection") return "category";
  if (pageType === "brand") return "brand";
  if (pageType === "tag") return "tag";
  if (pageType === "cms") return "page";
  return "page";
}
