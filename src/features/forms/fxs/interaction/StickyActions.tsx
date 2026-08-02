"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FxsStickyActionsConfig } from "../types";

export function StickyActions({
  config,
  className,
  mobileOnlySticky = true,
}: {
  config: FxsStickyActionsConfig;
  className?: string;
  mobileOnlySticky?: boolean;
}) {
  const {
    primaryLabel,
    secondaryLabel,
    backLabel = "Back",
    draftLabel = "Save draft",
    loading,
    disabled,
    showBack,
    showDraft,
    showCancel,
    onPrimary,
    onSecondary,
    onBack,
    onDraft,
    onCancel,
  } = config;

  const hasSecondaryRow = showBack || showCancel || showDraft || Boolean(onSecondary && !showCancel);

  return (
    <div
      className={cn(
        "fxs-sticky-actions border-t border-border/70 bg-background/95 backdrop-blur",
        "px-4 py-3 sm:px-0",
        mobileOnlySticky
          ? "sticky bottom-0 z-20 -mx-4 mt-6 sm:static sm:mx-0 sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
          : "sticky bottom-0 z-20 mt-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center",
          hasSecondaryRow ? "sm:justify-between" : "sm:justify-end",
        )}
      >
        {hasSecondaryRow ? (
          <div className="flex flex-wrap gap-2">
            {showBack ? (
              <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
                {backLabel}
              </Button>
            ) : null}
            {showCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
                {secondaryLabel ?? "Cancel"}
              </Button>
            ) : null}
            {showDraft ? (
              <Button type="button" variant="ghost" onClick={onDraft} disabled={loading}>
                {draftLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
          {onSecondary && !showCancel ? (
            <Button type="button" variant="outline" onClick={onSecondary} disabled={loading}>
              {secondaryLabel ?? "Cancel"}
            </Button>
          ) : null}
          <Button
            type={onPrimary ? "button" : "submit"}
            onClick={onPrimary}
            disabled={disabled || loading}
            className="min-h-11 w-full sm:min-w-[12rem] sm:w-auto"
          >
            {loading ? "Submitting…" : primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

