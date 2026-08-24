"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { getBreadcrumbs, type AdminBreadcrumb } from "@/config/admin-nav";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminBreadcrumbsProps = {
  className?: string;
  items?: AdminBreadcrumb[];
};

function BreadcrumbSegment({
  crumb,
  isLast,
}: {
  crumb: AdminBreadcrumb;
  isLast: boolean;
}) {
  const options = crumb.options?.filter((option) => option.href) ?? [];
  const showMenu = options.length > 1;
  const labelClass = cn(
    "truncate",
    isLast || !crumb.href ? "font-medium text-foreground" : "text-muted-foreground",
  );

  if (!showMenu) {
    if (crumb.href) {
      return (
        <Link
          href={crumb.href}
          className={cn(labelClass, "transition-colors hover:text-foreground")}
        >
          {crumb.label}
        </Link>
      );
    }
    return <span className={labelClass}>{crumb.label}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-[12rem] items-center gap-0.5 rounded-md px-1.5 py-0.5 text-sm transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label={`Navigate from ${crumb.label}`}
        >
          <span className={labelClass}>{crumb.label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {options.map((option) => {
          const active = option.current === true;
          return (
            <DropdownMenuItem key={`${option.label}-${option.href}`} asChild>
              <Link href={option.href} className="flex items-center gap-2">
                <span className="flex-1 truncate">{option.label}</span>
                {active ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminBreadcrumbs({ className, items }: AdminBreadcrumbsProps) {
  const pathname = usePathname() ?? "/admin";
  const crumbs = items ?? getBreadcrumbs(pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm", className)}
    >
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-0.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
          <BreadcrumbSegment crumb={crumb} isLast={i === crumbs.length - 1} />
        </span>
      ))}
    </nav>
  );
}
