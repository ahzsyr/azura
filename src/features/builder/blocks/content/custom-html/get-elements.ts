import type { HtmlElement } from "./types";
import { deserializeHtml, deserializeLegacyItems } from "./deserialize";

const LOCALE_HTML_PATTERN = /^html([A-Z][a-z]+)?$/;

function hasLegacyHtml(props: Record<string, unknown>): boolean {
  return Object.keys(props).some(
    (k) => LOCALE_HTML_PATTERN.test(k) && typeof props[k] === "string" && (props[k] as string).trim() !== ""
  );
}

function extractLegacyHtmlFields(props: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (LOCALE_HTML_PATTERN.test(k) && typeof v === "string") fields[k] = v;
  }
  return fields;
}

/**
 * Reads the HtmlElement[] from block props, with automatic legacy migration.
 *
 * Priority:
 * 1. `props.elements` (new format)
 * 2. `props.items[]` with html* fields (previous multi-item format)
 * 3. Top-level `props.html*` fields (original single-field format)
 */
export function getCustomHtmlElements(
  props: Record<string, unknown>,
  locale = "en"
): HtmlElement[] {
  // New format
  if (Array.isArray(props.elements) && props.elements.length > 0) {
    return props.elements as HtmlElement[];
  }

  // Previous multi-item format
  if (Array.isArray(props.items) && props.items.length > 0) {
    return deserializeLegacyItems(
      props.items as Array<{ id: string; html?: string; [key: string]: unknown }>,
      locale
    );
  }

  // Original single html field
  if (hasLegacyHtml(props)) {
    const fields = extractLegacyHtmlFields(props);
    const html =
      (fields[`html${getLocaleSuffix(locale)}`] as string | undefined) ||
      (fields.html as string | undefined) ||
      "";
    return html.trim() ? deserializeHtml(html) : [];
  }

  return [];
}

function getLocaleSuffix(locale: string): string {
  if (!locale || locale.toLowerCase() === "en") return "En";
  const parts = locale.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  return parts.join("");
}
