"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FxsValidationPhase } from "../types";
import { useFxsTheme } from "../core/ThemeProvider";
import { useCollapsibleFields } from "../core/LayoutEngine";
import { FxsHint, FxsLabel, RequiredBadge, ValidationMessage } from "./atoms";

export type FieldWrapperProps = {
  id?: string;
  label?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  error?: string | null;
  success?: string | null;
  phase?: FxsValidationPhase;
  characterCount?: { current: number; max?: number };
  leading?: ReactNode;
  children: ReactNode;
  className?: string;
  hideLabel?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

function phaseBorder(phase?: FxsValidationPhase, hasError?: boolean, hasSuccess?: boolean) {
  if (hasError || phase === "submitted" && hasError) return "border-[var(--fxs-danger)]";
  if (hasSuccess) return "border-[var(--fxs-success)]/50";
  return "border-[var(--fxs-border)] focus-within:border-[var(--fxs-focus-color,var(--fxs-border-focus))] focus-within:ring-2 focus-within:ring-[var(--fxs-focus-color,var(--fxs-border-focus))]/25";
}

export function FieldWrapper({
  id,
  label,
  hint,
  required,
  optional,
  error,
  success,
  phase = "idle",
  characterCount,
  leading,
  children,
  className,
  hideLabel,
  collapsible: collapsibleProp,
  defaultCollapsed = false,
}: FieldWrapperProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const { fieldMode, theme } = useFxsTheme();
  const fieldsCollapsibleFromContext = useCollapsibleFields();
  const collapsible = collapsibleProp ?? fieldsCollapsibleFromContext;
  const isFloating = fieldMode === "floating";
  const showSuccess = Boolean(success) && !error && (phase === "validated" || phase === "blurred");
  const [open, setOpen] = useState(!defaultCollapsed || Boolean(error));

  useEffect(() => {
    if (error) setOpen(true);
  }, [error]);

  const describedBy = useMemo(() => {
    const parts: string[] = [];
    if (hint) parts.push(hintId);
    if (error) parts.push(errorId);
    return parts.length ? parts.join(" ") : undefined;
  }, [hint, error, hintId, errorId]);

  const modeClass =
    fieldMode === "filled"
      ? "bg-muted/50 border-transparent"
      : fieldMode === "underline"
        ? "rounded-none border-0 border-b bg-transparent px-0 shadow-none"
        : fieldMode === "outlined"
          ? "bg-transparent"
          : "bg-background";

  const densityPad =
    theme.fieldDensity === "compact"
      ? "[&_input]:h-11 [&_textarea]:min-h-[96px]"
      : theme.fieldDensity === "spacious"
        ? "[&_input]:h-14 [&_textarea]:min-h-[140px]"
        : "[&_input]:h-12 [&_textarea]:min-h-[120px]";

  return (
    <div
      className={cn("fxs-field space-y-1.5", className)}
      data-fxs-phase={phase}
      data-fxs-invalid={Boolean(error) || undefined}
    >
      {!hideLabel && label && !isFloating ? (
        <div
          className={cn("flex items-center gap-2", collapsible && "cursor-pointer")}
          onClick={collapsible ? () => setOpen((value) => !value) : undefined}
          onKeyDown={
            collapsible
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setOpen((value) => !value);
                  }
                }
              : undefined
          }
          role={collapsible ? "button" : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? open : undefined}
        >
          <FxsLabel htmlFor={fieldId}>{label}</FxsLabel>
          {required ? <RequiredBadge /> : null}
          {optional ? <RequiredBadge optional /> : null}
          {collapsible ? (
            <ChevronDown
              className={cn(
                "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          ) : null}
        </div>
      ) : null}

      <div
        className={cn("fxs-collapse-content", collapsible && "fxs-collapse-content--animated")}
        data-open={open || !collapsible}
      >
        <div className="min-h-0 space-y-1.5">
          <div
            className={cn(
              "group relative rounded-[var(--fxs-field-radius,var(--schema-radius-md))] border transition-shadow",
              modeClass,
              densityPad,
              phaseBorder(phase, Boolean(error), showSuccess),
              "hover:shadow-[var(--fxs-elev-sm)]",
              leading && "flex items-stretch",
            )}
            style={{
              transitionDuration: "var(--fxs-motion, 160ms)",
              borderWidth: "var(--fxs-border-width, 1px)",
            }}
          >
            {leading ? (
              <div className="flex items-center border-e border-[var(--fxs-border)] px-3 text-muted-foreground">
                {leading}
              </div>
            ) : null}
            <div className={cn("relative min-w-0 flex-1", isFloating && "pt-4")}>
              {isFloating && label ? (
                <FxsLabel htmlFor={fieldId} floating active>
                  {label}
                  {required ? " *" : ""}
                </FxsLabel>
              ) : null}
              <div
                className={cn(
                  "[&_input]:border-0 [&_input]:bg-transparent [&_input]:shadow-none [&_input]:focus-visible:ring-0",
                  "[&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:shadow-none [&_textarea]:focus-visible:ring-0",
                  "[&_select]:border-0 [&_select]:bg-transparent [&_select]:shadow-none",
                )}
                data-fxs-describedby={describedBy}
                data-fxs-field-id={fieldId}
              >
                {children}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              {hint && !error ? <FxsHint id={hintId}>{hint}</FxsHint> : null}
              <ValidationMessage
                id={errorId}
                error={error}
                success={showSuccess ? success : null}
              />
            </div>
            {characterCount ? (
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {characterCount.current}
                {characterCount.max != null ? ` / ${characterCount.max}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
