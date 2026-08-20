"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FormShell } from "./FormShell";
import { StickyActions } from "../interaction/StickyActions";
import { FormProgress } from "../interaction/Progress";
import { LiveSummary } from "../interaction/LiveSummary";
import { SuccessConfirmation, SubmitErrorBanner } from "../interaction/SuccessConfirmation";
import { ErrorSummary, errorsToSummaryItems } from "../validation/ErrorSummary";
import type { FxsExperienceConfig, FxsStickyActionsConfig, FxsSummaryItem } from "../types";
import { isFxsLiveSummaryEnabled } from "../feature-flags";

function FxsToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-lg"
    >
      {message}
    </div>
  );
}

export function FormExperience({
  config,
  children,
  footer,
  sticky,
  progress,
  summaryItems,
  errors,
  errorLabels,
  status,
  referenceId,
  onRetry,
  className,
}: {
  config?: FxsExperienceConfig;
  children: ReactNode;
  footer?: ReactNode;
  sticky?: FxsStickyActionsConfig;
  progress?: {
    step: number;
    total: number;
    labels?: string[];
  };
  summaryItems?: FxsSummaryItem[];
  errors?: Record<string, string>;
  errorLabels?: Record<string, string>;
  status?: "idle" | "submitting" | "success" | "error";
  referenceId?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const cfg = config ?? {};
  const showSummary =
    Boolean(cfg.enableLiveSummary) &&
    isFxsLiveSummaryEnabled() &&
    (summaryItems?.length ?? 0) > 0;

  const errorItems =
    cfg.enableErrorSummary !== false && errors
      ? errorsToSummaryItems(errors, errorLabels)
      : [];

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const prevErrorCount = useRef(0);

  useEffect(() => {
    const count = errorItems.length;
    // Toast when errors first appear (typically after submit, or first realtime failure)
    if (count > 0 && prevErrorCount.current === 0) {
      setToastMessage(
        count === 1
          ? "Please fix 1 error in the form."
          : `Please fix ${count} errors in the form.`,
      );
    }
    if (count === 0) {
      setToastMessage(null);
    }
    prevErrorCount.current = count;
  }, [errorItems.length]);

  if (status === "success") {
    return (
      <FormShell config={cfg} className={className}>
        <SuccessConfirmation
          title={cfg.successTitle}
          description={cfg.successDescription}
          referenceId={referenceId}
          expectedReply={cfg.estimatedResponse}
        />
      </FormShell>
    );
  }

  const aside = showSummary ? (
    <LiveSummary
      items={summaryItems ?? []}
      footer={cfg.estimatedResponse ? `Estimated response · ${cfg.estimatedResponse}` : undefined}
      className="sticky top-8"
    />
  ) : undefined;

  return (
    <FormShell config={cfg} aside={aside} className={className}>
      {progress && progress.total > 1 ? (
        <FormProgress
          step={progress.step}
          total={progress.total}
          labels={progress.labels}
          style={cfg.progressStyle ?? "bar"}
        />
      ) : null}

      {errorItems.length > 0 ? <ErrorSummary items={errorItems} /> : null}
      {status === "error" ? <SubmitErrorBanner onRetry={onRetry} /> : null}

      {children}

      {sticky ? (
        <StickyActions
          config={{
            ...sticky,
            loading: sticky.loading || status === "submitting",
          }}
        />
      ) : (
        footer
      )}

      {toastMessage ? (
        <FxsToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      ) : null}
    </FormShell>
  );
}
