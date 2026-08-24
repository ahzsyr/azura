"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  catalogStatusLabel,
  type CatalogWorkspaceStatus,
} from "./catalog-workspace-state";

type CatalogEmptyStateProps = {
  status?: Extract<
    CatalogWorkspaceStatus,
    "empty" | "filtered_empty" | "error" | "loading" | "permission_denied"
  >;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function CatalogEmptyState({
  status = "empty",
  title,
  description,
  action,
  className,
}: CatalogEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">
        {title ?? catalogStatusLabel(status)}
      </p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
