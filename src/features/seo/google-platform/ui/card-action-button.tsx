"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: boolean; message: string } | null;

export function CardActionButton({
  label,
  formAction,
  hiddenFields,
  variant = "outline",
}: {
  label: string;
  formAction: (formData: FormData) => Promise<{ ok: boolean; message: string } | void>;
  hiddenFields: Record<string, string>;
  variant?: "default" | "outline" | "secondary" | "destructive";
}) {
  const [state, dispatch, isPending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      try {
        const result = await formAction(formData);
        if (result && typeof result === "object" && "message" in result) {
          return { ok: result.ok !== false, message: String(result.message) };
        }
        return { ok: true, message: "Action completed" };
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
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button type="submit" variant={variant} size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {isPending ? "Working…" : label}
        </Button>
      </form>
      {state ? (
        <p
          role="status"
          className={`text-xs max-w-[14rem] ${
            state.ok ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
