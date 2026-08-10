"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getBreadcrumbs } from "@/config/admin-nav";
import { cn } from "@/lib/utils";

type AdminBreadcrumbsProps = {
  className?: string;
  items?: { label: string; href?: string }[];
};

export function AdminBreadcrumbs({ className, items }: AdminBreadcrumbsProps) {
  const pathname = usePathname();
  const crumbs = items ?? getBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className={cn("flex min-w-0 items-center gap-1 text-sm", className)}>
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="truncate text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate font-medium text-foreground">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
