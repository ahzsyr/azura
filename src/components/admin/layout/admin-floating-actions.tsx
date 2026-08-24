"use client";

import { ThemeModeToggle } from "@/components/theme/theme-mode-toggle";
import { ContextualHelpButton } from "@/features/help/components/contextual-help-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminTheme } from "./admin-theme-provider";
import { cn } from "@/lib/utils";

type AdminFloatingActionsProps = {
  children: React.ReactNode;
  className?: string;
};

/** Fixed action cluster for page-level shortcuts (e.g. mobile save FAB). */
export function AdminFloatingActions({ children, className }: AdminFloatingActionsProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 end-6 z-40 flex flex-col gap-2 lg:hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Persistent help + theme controls, kept off the top bar. */
export function AdminChromeFab() {
  const { resolvedTheme } = useAdminTheme();

  return (
    <div className="pointer-events-none fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] end-[max(1.5rem,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-2">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <ContextualHelpButton variant="fab" />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="rounded-full border border-border/70 bg-background/90 p-1 shadow-lg backdrop-blur-md">
              <ThemeModeToggle size="sm" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            Toggle {resolvedTheme === "dark" ? "light" : "dark"} mode
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
