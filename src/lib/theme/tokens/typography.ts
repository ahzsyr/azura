import type { ThemeTokens } from "@/types/theme";
import type { LocaleFontOverride } from "@/schemas/theme";
import { DEFAULT_MONO_FONT } from "@/features/theme/tokens/design-tokens";

export const FONT_FAMILY_TOKENS = {
  body: "--font-body",
  heading: "--font-heading",
  display: "--font-display",
  mono: "--font-mono",
  azBody: "--az-font-body",
  azDisplay: "--az-font-display",
  azMono: "--az-font-mono",
} as const;

export const FONT_SCALE_TOKENS = {
  root: "--font-size-root",
  base: "--font-size-base",
  headingScale: "--heading-scale",
  hero: "--az-fs-hero",
  h1: "--az-fs-h1",
  h2: "--az-fs-h2",
  h3: "--az-fs-h3",
  h4: "--az-fs-h4",
  body: "--az-fs-body",
  small: "--az-fs-small",
} as const;

function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escapeCssAttr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isValidLangToken(value: string): boolean {
  return /^[a-zA-Z]{1,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(value);
}

function collectLocaleVariants(localeKey: string, htmlLang: string): string[] {
  const variants = new Set<string>();
  const push = (value: string) => {
    const normalized = value.trim().replace(/_/g, "-");
    if (!normalized) return;
    variants.add(normalized);
    variants.add(normalized.toLowerCase());
    const primary = normalized.split("-")[0];
    if (primary) variants.add(primary.toLowerCase());
  };

  push(localeKey);
  push(htmlLang);
  return Array.from(variants);
}

function buildLocaleFontSelectors(localeKey: string, override: LocaleFontOverride): string[] {
  const selectors = new Set<string>();
  const htmlLang = override.htmlLang ?? localeKey;

  for (const variant of collectLocaleVariants(localeKey, htmlLang)) {
    const safeKey = variant.replace(/[^a-zA-Z0-9_-]/g, "");
    if (safeKey) {
      selectors.add(`html[data-locale="${escapeCssAttr(safeKey)}"]`);
      selectors.add(`html[data-locale^="${escapeCssAttr(safeKey)}-"]`);
    }

    const safeLang = variant.replace(/[^a-zA-Z0-9-]/g, "");
    if (safeLang) {
      selectors.add(`html[lang="${escapeCssAttr(safeLang)}"]`);
      selectors.add(`html[lang^="${escapeCssAttr(safeLang)}-"]`);
      if (isValidLangToken(safeLang)) {
        selectors.add(`html:lang(${safeLang})`);
      }
    }
  }

  return Array.from(selectors);
}

function buildLocaleFontOverrideBlock(
  localeKey: string,
  override: LocaleFontOverride,
): string | null {
  if (!override.bodyFont && !override.headingFont) return null;

  const selectors = buildLocaleFontSelectors(localeKey, override);
  if (selectors.length === 0) return null;

  const declarations: string[] = [];
  if (override.bodyFont) {
    const body = escapeCssString(override.bodyFont);
    declarations.push(`--az-font-body:'${body}',sans-serif`);
    declarations.push(`--font-body:'${body}',sans-serif`);
  }
  if (override.headingFont) {
    const heading = escapeCssString(override.headingFont);
    declarations.push(`--az-font-display:'${heading}',sans-serif`);
    declarations.push(`--font-display:'${heading}',sans-serif`);
    declarations.push(`--font-heading:'${heading}',serif`);
  }

  return `${selectors.join(",\n")} {\n  ${declarations.join(";\n  ")};\n}`;
}

function buildLocaleFontCss(tokens: ThemeTokens): string {
  const localeFonts = tokens.typography.localeFonts;
  if (!localeFonts) return "";

  return Object.entries(localeFonts)
    .map(([localeKey, override]) => buildLocaleFontOverrideBlock(localeKey, override))
    .filter(Boolean)
    .join("\n");
}

/** Centralized typography CSS from theme tokens. */
export function buildTypographyCss(tokens: ThemeTokens): string {
  const c = tokens.typography;
  const globalBlock = `html {
  --az-font-display:'${escapeCssString(c.headingFont)}',sans-serif;
  --az-font-body:'${escapeCssString(c.bodyFont)}',sans-serif;
  --az-font-mono:'${DEFAULT_MONO_FONT}',monospace;
  --font-display:var(--az-font-display);
  --font-body:var(--az-font-body);
  --font-mono:var(--az-font-mono);
  --font-heading:var(--az-font-display);
  --font-size-root:${c.baseFontSize};
  --font-size-base:${c.baseFontSize};
  --heading-scale:${c.headingScale};
  --az-fs-hero:clamp(2.4rem,6vw,5.5rem);
  --az-fs-h1:clamp(2rem,4.5vw,4rem);
  --az-fs-h2:clamp(1.5rem,3vw,2.75rem);
  --az-fs-h3:clamp(1.2rem,2vw,1.875rem);
  --az-fs-h4:clamp(1rem,1.5vw,1.375rem);
  --az-fs-body:clamp(0.9rem,1.2vw,1.0625rem);
  --az-fs-small:clamp(0.72rem,1vw,0.84rem);
  --az-fs-mono:clamp(0.65rem,0.9vw,0.78rem);
  --az-fs-label:clamp(0.6rem,0.8vw,0.72rem);
}`;

  const localeBlocks = buildLocaleFontCss(tokens);
  return localeBlocks ? `${globalBlock}\n${localeBlocks}` : globalBlock;
}
