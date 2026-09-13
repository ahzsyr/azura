"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useAdminPageConfig } from "@/components/admin/layout/admin-page-config-provider";
import {
  getMissingRequiredActions,
  modeExpectsActions,
} from "@/config/admin-page-config";
import {
  getEnabledActionKeys,
  getRegisteredActionKeys,
  useAdminUiStore,
} from "@/stores/admin-ui-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Dev-only TopBar badge when a classified editor/settings page is missing required actions.
 * Uses a grace period so registration effects can settle before warning.
 */
export function AdminActionDevIndicator() {
  const config = useAdminPageConfig();
  const pageActions = useAdminUiStore((s) => s.pageActions);
  const activeOwner = useAdminUiStore((s) => s.activeOwner);
  const actionStack = useAdminUiStore((s) => s.actionStack);
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setReady(false);
    setDismissed(false);
    let cancelled = false;
    // Grace period: wait for registration effects after paint
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setReady(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [pathname, config]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!ready || !config || !modeExpectsActions(config.mode)) return;

    const missing = getMissingRequiredActions(config, pageActions);
    if (missing.length === 0) return;

    console.warn("[Admin Action System]", {
      route: pathname,
      mode: config.mode,
      expectedActions: config.expectedActions,
      registeredActions: getRegisteredActionKeys(pageActions),
      enabledActions: getEnabledActionKeys(pageActions),
      missingRequired: missing,
      activeOwner,
      stackDepth: actionStack.length,
    });
  }, [ready, config, pageActions, pathname, activeOwner, actionStack.length]);

  if (process.env.NODE_ENV === "production") return null;
  if (!ready || dismissed || !config || !modeExpectsActions(config.mode)) return null;

  const missing = getMissingRequiredActions(config, pageActions);
  if (missing.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "hidden items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 sm:inline-flex dark:text-amber-300",
          )}
          onClick={() => setDismissed(true)}
          aria-label="Missing admin actions"
        >
          <AlertTriangle className="h-3 w-3" />
          Missing admin actions
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        <p className="font-medium">Missing required: {missing.join(", ")}</p>
        <p className="mt-1 text-muted-foreground">
          Owner: {activeOwner?.ownerKey ?? "none"} · Stack: {actionStack.length}
        </p>
        <p className="mt-1 text-muted-foreground">Click to dismiss. See console for details.</p>
      </TooltipContent>
    </Tooltip>
  );
}
