"use client";

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
