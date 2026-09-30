"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { adaptRichTextHtmlColors } from "@/features/builder/blocks/content/lib/adapt-rich-text-colors";
import { sanitizeHtml } from "@/lib/sanitize-html";
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

export type ExpandableRichTextProps = {
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

function estimateMaxHeightPx(
  previewBy: FeatureGridPreviewBy,
  previewLimit: number,
  lineHeightPx = 22
): number {
  return estimateFeatureGridLineClamp(previewBy, previewLimit) * lineHeightPx;
}

export function FeatureGridExpandableHtml({
  html,
  enabled = true,
  mode = "inline",
  previewBy = "lines",
  previewLimit = 3,
  moreLabel = "Read More",
  lessLabel = "Read Less",
  buttonStyle = "text",
  dialogTitle = "Details",
  className,
  proseClassName,
}: ExpandableRichTextProps) {
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const adapted = html.trim() ? adaptRichTextHtmlColors(sanitizeHtml(html)) : "";
  const lineClamp = estimateFeatureGridLineClamp(previewBy, previewLimit);
  const maxHeightPx = estimateMaxHeightPx(previewBy, previewLimit);
  const showFullInline = enabled && mode === "inline" && expanded;
  const clamped = !showFullInline;
  const legacyClamp = !enabled;

  const checkOverflow = useCallback(() => {
    const el = contentRef.current;
    if (!el) {
      setOverflows(false);
      return;
    }
    if (!enabled) {
      setOverflows(false);
      return;
    }
    if (showFullInline) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [enabled, showFullInline]);

  useEffect(() => {
    checkOverflow();
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [adapted, checkOverflow, previewLimit, previewBy, enabled]);

  useEffect(() => {
    if (!enabled) {
      setExpanded(false);
      setOverlayOpen(false);
    }
  }, [enabled]);

  if (!adapted) return null;

  const proseClasses = cn(
    "prose max-w-none cb-advanced-richtext text-sm leading-relaxed text-card-foreground/75",
    "[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
    proseClassName
  );

  const buttonClass = cn(
    "mt-3 inline-flex items-center text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    buttonStyle === "text" && "text-primary hover:underline",
    buttonStyle === "outlined" &&
      "rounded-md border border-primary px-3 py-1.5 text-primary hover:bg-primary/5",
    buttonStyle === "filled" &&
      "rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
  );

  const showToggle = enabled && overflows;

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "inline") {
      setExpanded((v) => !v);
      return;
    }
    setOverlayOpen(true);
  };

  const richBody = (
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
        ref={contentRef}
        className={cn(
          "feature-grid-expandable__content overflow-hidden transition-[max-height] motion-reduce:transition-none",
          clamped && "feature-grid-expandable__content--clamped"
        )}
        style={
          clamped
            ? previewBy === "lines" || legacyClamp
              ? {
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical" as const,
                  WebkitLineClamp: legacyClamp ? 3 : lineClamp,
                  overflow: "hidden",
                }
              : {
                  maxHeight: maxHeightPx,
                  overflow: "hidden",
                }
            : undefined
        }
        aria-expanded={enabled ? (mode === "inline" ? expanded : overlayOpen) : undefined}
      >
        {richBody}
      </div>

      {showToggle ? (
        <button
          type="button"
          className={buttonClass}
          onClick={handleToggle}
          aria-expanded={mode === "inline" ? expanded : overlayOpen}
          aria-controls={mode === "inline" ? contentId : undefined}
        >
          {mode === "inline" ? (expanded ? lessLabel : moreLabel) : moreLabel}
        </button>
      ) : null}

      {mode === "modal" ? (
        <Dialog open={overlayOpen} onOpenChange={setOverlayOpen}>
          <DialogContent
            className="max-h-[85vh] max-w-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>
            {richBody}
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
            <div className="mt-4">{richBody}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
