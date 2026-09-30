import type { HtmlElement } from "./types";

export type ValidationWarning = {
  elementId: string;
  tag: string;
  message: string;
  severity: "warning" | "error";
};

function collectElements(elements: HtmlElement[]): HtmlElement[] {
  const all: HtmlElement[] = [];
  function walk(items: HtmlElement[]) {
    for (const el of items) {
      all.push(el);
      if (Array.isArray(el.children)) walk(el.children);
    }
  }
  walk(elements);
  return all;
}

type ElementWithParent = {
  el: HtmlElement;
  parentTag?: string;
};

function collectElementsWithParent(
  elements: HtmlElement[],
  parentTag?: string
): ElementWithParent[] {
  const all: ElementWithParent[] = [];
  for (const el of elements) {
    all.push({ el, parentTag });
    if (Array.isArray(el.children) && el.children.length > 0) {
      all.push(...collectElementsWithParent(el.children, el.tag));
    }
  }
  return all;
}

export function validateElements(elements: HtmlElement[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const all = collectElements(elements);
  const allWithParents = collectElementsWithParent(elements);

  // Duplicate element IDs
  const seenIds = new Set<string>();
  for (const el of all) {
    const attrId = el.attributes?.id;
    if (attrId) {
      if (seenIds.has(attrId)) {
        warnings.push({
          elementId: el.id,
          tag: el.tag,
          message: `Duplicate id="${attrId}" — IDs must be unique on the page`,
          severity: "error",
        });
      } else {
        seenIds.add(attrId);
      }
    }
  }

  for (const el of all) {
    if (el.hidden) continue;

    // img / figure missing alt
    if ((el.tag === "img" || el.tag === "figure") && !el.rawHtml) {
      const alt = el.attributes?.alt ?? "";
      if (!alt.trim()) {
        warnings.push({
          elementId: el.id,
          tag: el.tag,
          message: "Image is missing alt text — required for accessibility",
          severity: "warning",
        });
      }
    }

    // Empty headings
    if (/^h[1-6]$/.test(el.tag) && !el.rawHtml) {
      const hasText = Object.keys(el).some(
        (k) => k === "text" || k.startsWith("text")
      ) && (el.text ?? "").trim() !== "";
      if (!hasText) {
        warnings.push({
          elementId: el.id,
          tag: el.tag,
          message: "Heading has no text content",
          severity: "warning",
        });
      }
    }

    // Link missing href
    if (el.tag === "a" && !el.rawHtml) {
      const href = el.attributes?.href ?? "";
      if (!href.trim()) {
        warnings.push({
          elementId: el.id,
          tag: el.tag,
          message: "Link is missing href",
          severity: "warning",
        });
      }
    }

    // handled below with parent-aware nesting validation
  }

  // Parent-aware nesting checks
  for (const { el, parentTag } of allWithParents) {
    if (el.hidden) continue;
    if (el.tag === "li" && parentTag !== "ul" && parentTag !== "ol") {
      warnings.push({
        elementId: el.id,
        tag: "li",
        message: "List item (li) should be inside a ul or ol",
        severity: "warning",
      });
    }
  }

  // Table validation
  for (const el of all) {
    if (el.hidden || el.tag !== "table" || el.rawHtml !== undefined) continue;

    const tbody = el.children?.find((c) => c.tag === "tbody");
    const bodyRows = tbody?.children ?? [];

    if (bodyRows.length === 0) {
      warnings.push({
        elementId: el.id,
        tag: "table",
        message: "Table has no rows — add at least one body row",
        severity: "warning",
      });
    }

    const thead = el.children?.find((c) => c.tag === "thead");
    if (thead) {
      const headerRow = thead.children?.[0];
      const allHeaderCellsEmpty = (headerRow?.children ?? []).every(
        (c) => !(c.text ?? "").trim()
      );
      if (allHeaderCellsEmpty && (headerRow?.children?.length ?? 0) > 0) {
        warnings.push({
          elementId: el.id,
          tag: "table",
          message: "Table header row has all empty cells",
          severity: "warning",
        });
      }
    }

    const tfoot = el.children?.find((c) => c.tag === "tfoot");
    if (tfoot) {
      const footerRow = tfoot.children?.[0];
      const allFooterCellsEmpty = (footerRow?.children ?? []).every(
        (c) => !(c.text ?? "").trim()
      );
      if (allFooterCellsEmpty && (footerRow?.children?.length ?? 0) > 0) {
        warnings.push({
          elementId: el.id,
          tag: "table",
          message: "Table footer row has all empty cells",
          severity: "warning",
        });
      }
    }

    // colspan / rowspan bounds check (basic)
    const allCells = collectElements(el.children ?? []).filter(
      (c) => c.tag === "th" || c.tag === "td"
    );
    const colCount = Math.max(
      ...(bodyRows[0]?.children?.map(() => 1) ?? [1]).map((_, i) =>
        bodyRows[0]?.children?.length ?? 1
      )
    );
    for (const cell of allCells) {
      if ((cell.attributes?.colspan ?? 1) > colCount) {
        warnings.push({
          elementId: cell.id,
          tag: cell.tag,
          message: `colspan (${cell.attributes?.colspan}) exceeds table column count (${colCount})`,
          severity: "warning",
        });
      }
    }
  }

  return warnings;
}
