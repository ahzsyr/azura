/** Loaded from `seeds/catalog/currency.config.json` (embedded at build). */
export interface CurrencyEntry {
  code: string;
  label: string;
  /** Passed to `Intl.NumberFormat` for grouping / symbol placement */
  numberLocale: string;
  /** Shown in region modal when no logo (e.g. $, €) */
  symbol?: string;
  /** Public path or absolute URL to PNG/WebP/SVG file (e.g. `/uploads/images/…`) */
  logo?: string;
  /** When `codeDisplay` is `svg`, inline markup (sanitized on save). File URL in `logo` is alternative. */
  svgInline?: string;
  /**
   * How the currency glyph shows in the region modal.
   * Omit to infer: inline SVG → svg; `logo` URL → image; else text.
   */
  codeDisplay?: "text" | "image" | "svg";
}

export interface CurrencyConfigFile {
  baseCurrency: string;
  /** When no cookie, use this ISO code (independent of UI locale). */
  defaultDisplayCurrency?: string;
  cookieName: string;
  cookieMaxAge: number;
  currencies: CurrencyEntry[];
  /** Units of each ISO code per **one** unit of `baseCurrency` (e.g. 1 USD → 3.67 AED). */
  rates: Record<string, number>;
}

/** Injected on `Astro.locals.currency` for storefront SSR */
export interface ShopperCurrencyContext {
  displayCode: string;
  numberLocale: string;
  baseCurrency: string;
  rates: Record<string, number>;
  source: "cookie" | "config" | "default";
  /** Active row branding (optional) */
  displaySymbol: string | null;
  /** Image/SVG file URL for `<img>`, when used */
  displayLogo: string | null;
  /** Sanitized inline SVG when active row uses inline vector */
  displaySvgInline: string | null;
  /** Resolved render mode for the active currency mark */
  currencyMarkRenderAs: "text" | "img" | "inlineSvg";
}
