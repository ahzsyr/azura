"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  FeatureGridExpandMode,
  FeatureGridPreviewBy,
  FeatureGridReadMoreStyle,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { estimateFeatureGridLineClamp } from "@/features/builder/blocks/marketing/lib/normalize-feature-grid";
import "@/features/builder/blocks/content/components/advanced-rich-text.css";
import "@/features/builder/blocks/marketing/components/feature-grid-expandable.css";

export type ExpandableRichTextProps = {
  /**
   * Pre-sanitized, theme-color-adapted HTML from the parent.
   * Do not pass raw CMS HTML — re-purify here can diverge SSR (jsdom) vs client (DOMPurify).
   */
  html: string;
  enabled?: boolean;
  mode?: FeatureGridExpandMode;
  previewBy?: FeatureGridPreviewBy;
  previewLimit?: number;
  moreLabel?: string;
  lessLabel?: string;
  buttonStyle?: FeatureGridReadMoreStyle;
  dialogTitle?: string;
  className?: string;
  proseClassName?: string;
};

function resolveLineHeightPx(el: HTMLElement): number {
  const styles = window.getComputedStyle(el);
  const parsedLh = Number.parseFloat(styles.lineHeight);
  const fontSize = Number.parseFloat(styles.fontSize) || 14;
  return Number.isFinite(parsedLh) ? parsedLh : fontSize * 1.625;
}

export function FeatureGridExpandableHtml({
  html,
  enabled = true,
  mode = "inline",
  previewBy = "lines",
  previewLimit = 3,
  moreLabel = "View more",
  lessLabel = "View less",
  buttonStyle = "text",
  dialogTitle = "Details",
  className,
  proseClassName,
}: ExpandableRichTextProps) {
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [previewPx, setPreviewPx] = useState<number | undefined>(undefined);
  const [fullPx, setFullPx] = useState<number | undefined>(undefined);
  const [lineHeightPx, setLineHeightPx] = useState(22);
  const excerptRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const adapted = html.trim();
  const lineClamp = estimateFeatureGridLineClamp(previewBy, previewLimit);
  const showFullInline = enabled && mode === "inline" && expanded;
  const useInlineToggle = buttonStyle === "text";
  const isClamped = Boolean(enabled && !showFullInline && overflows);
  const showInlineOnLastLine = Boolean(isClamped && useInlineToggle);

  const measure = useCallback(() => {
    const body = bodyRef.current;
    const excerpt = excerptRef.current;
    if (!body || !excerpt) return;

    if (!enabled) {
      setOverflows(false);
      setPreviewPx(undefined);
      setFullPx(undefined);
      return;
    }

    // Temporarily unclamp so we measure the true content height.
    const hadClamp = excerpt.classList.contains("feature-grid-expandable__excerpt--clamped");
    const prevHeight = excerpt.style.height;
    const prevMax = excerpt.style.maxHeight;
    excerpt.classList.remove("feature-grid-expandable__excerpt--clamped");
    excerpt.style.height = "auto";
    excerpt.style.maxHeight = "none";

    const lh = resolveLineHeightPx(body);
    const full = Math.ceil(body.getBoundingClientRect().height || body.scrollHeight);
    const preview = Math.ceil(Math.max(1, lineClamp) * lh);
    const doesOverflow = full > preview + 1;

    setLineHeightPx(lh);
    setOverflows(doesOverflow);
    setPreviewPx(preview);
    setFullPx(full);

    excerpt.style.height = prevHeight;
    excerpt.style.maxHeight = prevMax;
    if (hadClamp) excerpt.classList.add("feature-grid-expandable__excerpt--clamped");
  }, [enabled, lineClamp]);

  useLayoutEffect(() => {
    measure();
  }, [adapted, measure, expanded, mode, buttonStyle]);

  useEffect(() => {
    const excerpt = excerptRef.current;
    const body = bodyRef.current;
    if (!excerpt) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(excerpt);
    if (body) observer.observe(body);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!enabled) {
      setExpanded(false);
      setOverlayOpen(false);
    }
  }, [enabled]);

  if (!adapted) return null;

  const proseClasses = cn(
    "feature-grid-expandable__body prose max-w-none cb-advanced-richtext text-sm leading-relaxed text-card-foreground/75",
    "[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
    proseClassName
  );

  const showToggle = enabled && overflows;
  const toggleLabel = mode === "inline" ? (expanded ? lessLabel : moreLabel) : moreLabel;

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "inline") {
      setExpanded((v) => !v);
      return;
    }
    setOverlayOpen(true);
  };

  const toggleClass = cn(
    "feature-grid-expandable__toggle cursor-pointer",
    buttonStyle === "text" && "feature-grid-expandable__toggle--text",
    buttonStyle === "outlined" && "feature-grid-expandable__toggle--outlined",
    buttonStyle === "filled" && "feature-grid-expandable__toggle--filled",
    showInlineOnLastLine
      ? "feature-grid-expandable__toggle--inline"
      : "feature-grid-expandable__toggle--below"
  );

  const toggleButton = showToggle ? (
    <button
      type="button"
      className={toggleClass}
      onClick={handleToggle}
      aria-expanded={mode === "inline" ? expanded : overlayOpen}
      aria-controls={mode === "inline" ? contentId : undefined}
    >
      {showInlineOnLastLine ? (
        <span className="feature-grid-expandable__toggle-ellipsis" aria-hidden="true">
          ...
        </span>
      ) : null}
      {toggleLabel}
    </button>
  ) : null;

  // Explicit height (not only max-height) so the float spacer's % height resolves
  // and Read More lands on the last line instead of the first.
  const excerptStyle: React.CSSProperties | undefined = (() => {
    if (!enabled || !overflows || previewPx == null) return undefined;
    if (showInlineOnLastLine) {
      return {
        height: previewPx,
        ["--fg-excerpt-height" as string]: `${previewPx}px`,
        ["--fg-line-height" as string]: `${lineHeightPx}px`,
      };
    }
    if (showFullInline && fullPx != null) {
      return { height: fullPx, maxHeight: fullPx };
    }
    return { maxHeight: previewPx };
  })();

  const overlayBody = (
    <div
      className={proseClasses}
      dangerouslySetInnerHTML={{ __html: adapted }}
      dir="auto"
    />
  );

  return (
    <div className={cn("feature-grid-expandable", className)}>
      <div
        id={contentId}
        ref={excerptRef}
        className={cn(
          "feature-grid-expandable__excerpt",
          showInlineOnLastLine && "feature-grid-expandable__excerpt--clamped"
        )}
        style={excerptStyle}
        aria-expanded={enabled ? (mode === "inline" ? expanded : overlayOpen) : undefined}
      >
        {/* Must be first child: float technique places it on the last visible line. */}
        {showInlineOnLastLine ? toggleButton : null}
        <div
          ref={bodyRef}
          className={proseClasses}
          dangerouslySetInnerHTML={{ __html: adapted }}
          dir="auto"
        />
      </div>

      {showToggle && !showInlineOnLastLine ? toggleButton : null}

      {mode === "modal" ? (
        <Dialog open={overlayOpen} onOpenChange={setOverlayOpen}>
          <DialogContent
            className="dialog-content max-h-[85vh] max-w-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
              {overlayBody}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {mode === "drawer" ? (
        <Sheet open={overlayOpen} onOpenChange={setOverlayOpen}>
          <SheetContent
            side="right"
            className="w-full overflow-y-auto sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <SheetHeader>
              <SheetTitle>{dialogTitle}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 animate-in fade-in-0 slide-in-from-right-2 duration-300">
              {overlayBody}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
