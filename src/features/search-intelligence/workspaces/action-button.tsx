"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionResultState = {
  ok: boolean;
  message: string;
  resultHref?: string;
  configureHref?: string;
  simulated?: boolean;
} | null;

function formatActionResult(result: unknown): ActionResultState {
  if (!result || typeof result !== "object") {
    return { ok: true, message: "Action completed" };
  }

  const data = result as {
    status?: unknown;
    summary?: unknown;
    resultHref?: unknown;
    configureHref?: unknown;
    ok?: unknown;
    simulated?: unknown;
    error?: unknown;
  };

  if (typeof data.summary === "string" && data.summary.trim()) {
    return {
      ok: data.ok !== false,
      message: data.summary,
      resultHref: typeof data.resultHref === "string" ? data.resultHref : undefined,
      configureHref: typeof data.configureHref === "string" ? data.configureHref : undefined,
      simulated: Boolean(data.simulated),
    };
  }

  if ("status" in data) {
    const status = String(data.status);
    const failed = status === "failed" || status === "rejected" || status === "error";
    return {
      ok: !failed,
      message: failed && typeof data.error === "string" ? data.error : `Status: ${status}`,
      resultHref: typeof data.resultHref === "string" ? data.resultHref : undefined,
      configureHref: typeof data.configureHref === "string" ? data.configureHref : undefined,
      simulated: Boolean(data.simulated),
    };
  }

  return { ok: true, message: "Action completed" };
}

export function ActionButton({
  children,
  formAction,
  variant = "default",
}: {
  children: React.ReactNode;
  /** Must be a Server Action reference — do not wrap in another async closure. */
  formAction: (formData: FormData) => unknown | Promise<unknown>;
  variant?: "default" | "outline" | "secondary" | "destructive";
}) {
  const [state, dispatch, isPending] = useActionState<ActionResultState, FormData>(
    async (_prev, formData) => {
      try {
        const result = await formAction(formData);
        return formatActionResult(result);
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Action failed",
        };
      }
    },
    null,
  );

  return (
    <div className="space-y-1">
      <form action={dispatch}>
        <Button type="submit" variant={variant} size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          {isPending ? "Working…" : children}
        </Button>
      </form>
      {state ? (
        <div
          role="status"
          className={`text-xs space-y-0.5 ${
            state.ok ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
          }`}
        >
          <p>
            {state.message}
            {state.simulated ? " · simulated" : ""}
          </p>
          {state.resultHref || state.configureHref ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {state.resultHref ? (
                <Link href={state.resultHref} className="text-primary hover:underline">
                  View result
                </Link>
              ) : null}
              {state.configureHref ? (
                <Link href={state.configureHref} className="text-primary hover:underline">
                  Configure
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
