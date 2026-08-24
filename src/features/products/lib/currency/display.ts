import type { ProductPrice } from "@/features/products/types";
import type { ShopperCurrencyContext } from "./types";
import { convertAmount } from "./convert";

/** Options shared by `createCurrencyFormatter` and glyph-aware price rendering. */
export function currencyNumberFormatOptions(displayCode: string): Intl.NumberFormatOptions {
  return {
    style: "currency",
    currency: displayCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: displayCode === "JPY" ? 0 : 2,
  };
}

export interface DisplayPriceNumbers {
  sale: number;
  compare: number | null;
  displayCode: string;
  numberLocale: string;
  storeCurrency: string;
  converted: boolean;
}

export function buildDisplayPrices(
  ctx: ShopperCurrencyContext,
  price: ProductPrice,
  oldPrice: number | null | undefined,
): DisplayPriceNumbers {
  const storeCurrency = (price.currency || ctx.displayCode).toUpperCase();
  const target = ctx.displayCode.toUpperCase();
  const converted = storeCurrency !== target;

  const sale = converted
    ? convertAmount(price.value, storeCurrency, target, ctx.rates)
    : price.value;

  let compare: number | null = null;
  if (oldPrice != null && Number.isFinite(oldPrice) && oldPrice > 0) {
    compare = converted ? convertAmount(oldPrice, storeCurrency, target, ctx.rates) : oldPrice;
  }

  return {
    sale,
    compare,
    displayCode: target,
    numberLocale: ctx.numberLocale,
    storeCurrency,
    converted,
  };
}

export function createCurrencyFormatter(displayCode: string, numberLocale: string) {
  return new Intl.NumberFormat(numberLocale, currencyNumberFormatOptions(displayCode));
}

/** One segment of a price string when using a custom currency glyph (image / inline SVG / text symbol). */
export type PriceFormatSegment =
  | { t: "txt"; v: string }
  | { t: "img"; src: string }
  | { t: "svg"; html: string }
  | { t: "sym"; v: string };

export type FormattedPriceForTemplate =
  | { useGlyph: false; formatted: string }
  | { useGlyph: true; segments: PriceFormatSegment[] };

/**
 * Formats a monetary amount for storefront HTML.
 * When the active currency uses image or inline SVG marks, replaces the `Intl` currency token
 * with that mark so prices match the region modal — plain `style: "currency"` always shows CLDR text.
 */
export function formatPriceForTemplate(
  ctx: ShopperCurrencyContext,
  amount: number,
  displayCode: string,
  numberLocale: string,
): FormattedPriceForTemplate {
  const nf = new Intl.NumberFormat(numberLocale, currencyNumberFormatOptions(displayCode));
  if (ctx.currencyMarkRenderAs === "text") {
    return { useGlyph: false, formatted: nf.format(amount) };
  }

  const raw: PriceFormatSegment[] = [];
  for (const p of nf.formatToParts(amount)) {
    if (p.type === "currency") {
      if (ctx.currencyMarkRenderAs === "img" && ctx.displayLogo) {
        raw.push({ t: "img", src: ctx.displayLogo });
      } else if (ctx.currencyMarkRenderAs === "inlineSvg" && ctx.displaySvgInline) {
        raw.push({ t: "svg", html: ctx.displaySvgInline });
      } else if (ctx.displaySymbol) {
        raw.push({ t: "sym", v: ctx.displaySymbol });
      } else {
        raw.push({ t: "txt", v: p.value });
      }
    } else {
      raw.push({ t: "txt", v: p.value });
    }
  }

  const segments: PriceFormatSegment[] = [];
  for (const s of raw) {
    const last = segments[segments.length - 1];
    if (s.t === "txt" && last?.t === "txt") last.v += s.v;
    else segments.push(s);
  }
  return { useGlyph: true, segments };
}
