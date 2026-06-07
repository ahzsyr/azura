"use client";

import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function SearchEmptyState({ title, description, icon, className, children }: Props) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        className
      )}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground"
        aria-hidden
      >
        {icon ?? <SearchX className="h-5 w-5" strokeWidth={1.75} />}
      </div>
      <p className="text-sm font-medium tracking-tight text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}
