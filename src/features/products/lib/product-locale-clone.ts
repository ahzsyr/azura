import type { Product, ProductDetailedSection } from "@/features/products/types";

export type LocaleCloneOpts = {
  targetLocale: string;
  sourceLocale: string;
  slug: string;
};

function cloneProductDeep(p: Product): Product {
  return JSON.parse(JSON.stringify(p)) as Product;
}

function needsTranslationLabel(sourceTitle: string): string {
  const t = sourceTitle.trim() || "Product";
  return `[Needs translation] ${t}`;
}

function stubDetailedDescription(sourceTitle: string): ProductDetailedSection[] {
  return [{ heading: "Overview", text: needsTranslationLabel(sourceTitle) }];
}

/**
 * Duplicate shared catalog fields from `base` into a new locale file with
 * placeholder copy and `localization.translation_status: "pending"`.
 */
export function buildLocalizedProductStub(base: Product, opts: LocaleCloneOpts): Product {
  const { sourceLocale, slug } = opts;
  const out = cloneProductDeep(base);
  const srcTitle = base.productTitle || base.name || base.title || slug;

  out.localization = {
    canonical_slug: slug,
    source_locale: sourceLocale,
    translation_status: "pending",
    uses_source_fallback: true,
  };

  const ph = needsTranslationLabel(srcTitle);
  out.productTitle = ph;
  out.name = ph;
  out.title = ph;
  out.title_extended = null;
  out.short_description = "";
  out.description = "";
  out.detailed_description = stubDetailedDescription(srcTitle);

  return out;
}

/** Mark the canonical / source locale document after import. */
export function markSourceProductLocalization(product: Product, slug: string, sourceLocale: string): Product {
  return {
    ...product,
    localization: {
      canonical_slug: slug,
      source_locale: sourceLocale,
      translation_status: "complete",
      uses_source_fallback: false,
    },
  };
}

function isBlank(s: string | null | undefined): boolean {
  return s == null || String(s).trim() === "";
}

export function shouldMergeLocaleFallback(product: Product): boolean {
  const loc = product.localization;
  if (loc?.uses_source_fallback) return true;
  const st = loc?.translation_status;
  return st === "pending" || st === "draft";
}

/**
 * Fill missing localized strings from `source` when stub metadata requests fallback.
 */
export function mergeProductLocaleFallback(localized: Product, source: Product): Product {
  if (!shouldMergeLocaleFallback(localized)) return localized;

  const out: Product = { ...localized };

  const pick = (loc: string | undefined, src: string | undefined, fallback: string) => {
    if (!isBlank(loc)) return loc!;
    if (!isBlank(src)) return src!;
    return fallback;
  };

  const srcTitle = source.productTitle || source.name || source.title || "";

  out.productTitle = pick(localized.productTitle, source.productTitle, srcTitle);
  out.name = pick(localized.name, source.name, out.productTitle);
  out.title = pick(localized.title, source.title, out.productTitle);

  if (localized.title_extended == null || isBlank(localized.title_extended as string)) {
    out.title_extended = source.title_extended ?? null;
  }

  out.short_description = pick(localized.short_description, source.short_description, "");
  out.description = pick(localized.description, source.description, "");

  const ld = localized.detailed_description ?? [];
  const sd = source.detailed_description ?? [];
  const locEmpty = ld.length === 0 || ld.every((x) => isBlank(x.text) && isBlank(x.heading));
  if (locEmpty && sd.length) {
    out.detailed_description = JSON.parse(JSON.stringify(sd)) as ProductDetailedSection[];
  }

  return out;
}
