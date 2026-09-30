"use client";

import { Loader2 } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/utils";

export type AdminActionToastTone = "running" | "success" | "error";

type AdminActionToast = {
  id: number;
  tone: AdminActionToastTone;
  message: string;
};

type Store = {
  toast: AdminActionToast | null;
  show: (tone: AdminActionToastTone, message: string) => number;
  dismiss: (id?: number) => void;
};

let nextId = 1;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useAdminActionToastStore = create<Store>((set, get) => ({
  toast: null,
  show: (tone, message) => {
    const id = nextId++;
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    set({ toast: { id, tone, message } });
    if (tone !== "running") {
      dismissTimer = setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, 4500);
    }
    return id;
  },
  dismiss: (id) => {
    const current = get().toast;
    if (!current) return;
    if (id != null && current.id !== id) return;
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    set({ toast: null });
  },
}));

export type AdminActionResult = {
  ok?: boolean;
  message?: string;
};

export async function runAdminAction<T>(
  runningMessage: string,
  work: () => Promise<T>,
  doneMessage?: string,
): Promise<T> {
  const { show } = useAdminActionToastStore.getState();
  show("running", runningMessage);
  try {
    const result = await work();
    if (result && typeof result === "object" && "ok" in result && typeof (result as AdminActionResult).ok === "boolean") {
      const action = result as AdminActionResult;
      show(
        action.ok === false ? "error" : "success",
        action.message?.trim() || doneMessage || (action.ok === false ? "That didn’t work." : "Done."),
      );
    } else {
      show("success", doneMessage || "Done.");
    }
    return result;
  } catch (error) {
    show("error", error instanceof Error ? error.message : "Something went wrong.");
    throw error;
  }
}

export function AdminActionToastHost() {
  const toast = useAdminActionToastStore((s) => s.toast);
  const dismiss = useAdminActionToastStore((s) => s.dismiss);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={toast.tone === "running"}
      className={cn(
        "fixed bottom-6 end-6 z-[120] flex max-w-sm items-start gap-3 overflow-hidden rounded-lg border px-4 py-3 text-sm shadow-lg",
        toast.tone === "running" && "border-border bg-background text-foreground",
        toast.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50",
        toast.tone === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {toast.tone === "running" ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
      <p className="min-w-0 flex-1">{toast.message}</p>
      {toast.tone !== "running" ? (
        <button
          type="button"
          className="shrink-0 text-xs opacity-70 hover:opacity-100"
          onClick={() => dismiss(toast.id)}
        >
          Close
        </button>
      ) : null}
      {toast.tone === "running" ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-muted">
          <span className="block h-full w-1/2 animate-pulse bg-primary" />
        </span>
      ) : null}
    </div>
  );
}
