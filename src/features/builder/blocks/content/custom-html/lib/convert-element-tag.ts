import type { HtmlElement, HtmlElementTag } from "../types";

const CONVERSION_GROUPS: Record<string, HtmlElementTag[]> = {
  textBlock: ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre"],
  inline: [
    "span", "strong", "em", "b", "i", "u", "mark",
    "small", "sup", "sub", "abbr", "kbd", "code",
  ],
  list: ["ul", "ol"],
  layout: ["div", "section", "article", "aside", "header", "footer", "main", "nav"],
};

/** Returns the allowed target tags for a given source tag (excluding itself), or [] if not convertible. */
export function getConvertibleTags(tag: HtmlElementTag): HtmlElementTag[] {
  for (const group of Object.values(CONVERSION_GROUPS)) {
    if (group.includes(tag)) {
      return group.filter((t) => t !== tag);
    }
  }
  return [];
}

/** Returns true if a tag belongs to any conversion group. */
export function isConvertibleTag(tag: HtmlElementTag): boolean {
  return getConvertibleTags(tag).length > 0;
}

/**
 * Convert an element to a new tag within the same group.
 * Preserves text content, attributes, children, hidden flag, and locale-suffixed fields.
 * Returns the same element unchanged if conversion is not allowed.
 */
export function convertElementTag(
  element: HtmlElement,
  newTag: HtmlElementTag
): HtmlElement {
  const allowed = getConvertibleTags(element.tag);
  if (!allowed.includes(newTag)) return element;

  const converted: HtmlElement = { ...element, tag: newTag };

  // When converting away from a heading, clear the anchor id attribute if it
  // looks like it was auto-generated (no custom value set by user).
  const isLeavingHeading = /^h[1-6]$/.test(element.tag) && !/^h[1-6]$/.test(newTag);
  const isEnteringHeading = !/^h[1-6]$/.test(element.tag) && /^h[1-6]$/.test(newTag);

  if (isLeavingHeading && converted.attributes?.id === "") {
    const { id: _id, ...rest } = converted.attributes ?? {};
    converted.attributes = Object.keys(rest).length ? rest : undefined;
  }

  if (isEnteringHeading && !converted.attributes?.id) {
    converted.attributes = { ...(converted.attributes ?? {}), id: "" };
  }

  return converted;
}
