"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "../a11y/motion";

export function SuccessConfirmation({
  title = "Thank you",
  description,
  referenceId,
  expectedReply,
  primaryActionLabel,
  onPrimaryAction,
  className,
}: {
  title?: string;
  description?: string;
  referenceId?: string;
  expectedReply?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  className?: string;
}) {
  const reduced = prefersReducedMotion();
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--schema-radius-lg)] border border-primary/20 bg-primary/5 px-6 py-10 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <CheckCircle2
        className={cn("mb-4 size-12 text-primary", !reduced && "fxs-success-pop")}
        aria-hidden
      />
      <h3 className="font-heading text-xl font-semibold">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {referenceId ? (
        <p className="mt-4 rounded-md border bg-background px-3 py-1.5 font-mono text-sm">
          Reference {referenceId.startsWith("#") ? referenceId : `#${referenceId}`}
        </p>
      ) : null}
      {expectedReply ? (
        <p className="mt-3 text-xs text-muted-foreground">Expected reply: {expectedReply}</p>
      ) : null}
      {primaryActionLabel && onPrimaryAction ? (
        <Button className="mt-6" onClick={onPrimaryAction}>
          {primaryActionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function SubmitErrorBanner({
  message = "We couldn't send your inquiry. Please check the highlighted fields.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--schema-radius-md)] border border-destructive/40 bg-destructive/5 p-4 text-sm"
    >
      <p className="font-medium text-destructive">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
