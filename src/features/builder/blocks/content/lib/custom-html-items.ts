export type CustomHtmlItem = {
  id: string;
  hidden?: boolean;
  [key: string]: unknown;
};

const LOCALE_HTML_PATTERN = /^html([A-Z][a-z]+)?$/;

function hasLegacyHtml(props: Record<string, unknown>): boolean {
  return Object.keys(props).some((k) => LOCALE_HTML_PATTERN.test(k) && typeof props[k] === "string" && (props[k] as string).trim() !== "");
}

function extractLegacyHtmlFields(props: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (LOCALE_HTML_PATTERN.test(k) && typeof v === "string") {
      fields[k] = v;
    }
  }
  return fields;
}

export function getCustomHtmlItems(props: Record<string, unknown>): CustomHtmlItem[] {
  if (Array.isArray(props.items) && props.items.length > 0) {
    return props.items as CustomHtmlItem[];
  }
  if (hasLegacyHtml(props)) {
    return [{ id: "legacy", ...extractLegacyHtmlFields(props) }];
  }
  return [];
}
