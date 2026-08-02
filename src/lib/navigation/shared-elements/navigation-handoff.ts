import type { SharedElementType } from "./names";
import { writeSharedElementHandoff } from "./context";

function parseSharedElementType(raw: string | null): SharedElementType | null {
  if (
    raw === "product" ||
    raw === "collection" ||
    raw === "blog" ||
    raw === "gallery" ||
    raw === "content"
  ) {
    return raw;
  }
  return null;
}

/**
 * Capture shared-element context from a clicked internal nav link before router.push.
 */
export function captureSharedElementHandoff(anchor: HTMLAnchorElement): void {
  if (typeof document === "undefined") return;
  if (document.documentElement.dataset.pageTransitionEnabled === "false") return;
  if (document.documentElement.dataset.sharedElementsEnabled === "false") return;

  const root = anchor.closest<HTMLElement>("[data-shared-element-root]");
  if (!root) return;

  const type = parseSharedElementType(root.getAttribute("data-shared-element-type"));
  const id = root.getAttribute("data-shared-element-id")?.trim();
  if (!type || !id) return;

  writeSharedElementHandoff({ type, id });
}
