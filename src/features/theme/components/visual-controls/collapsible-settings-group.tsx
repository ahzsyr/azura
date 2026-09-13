"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function CollapsibleSettingsGroup({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: Props) {
  return (
    <details
      className={cn("rounded-lg border bg-card", className)}
      open={defaultOpen || undefined}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        {description ? (
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{description}</span>
        ) : null}
      </summary>
      <div className="space-y-4 border-t px-4 py-4">{children}</div>
    </details>
  );
}
