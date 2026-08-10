"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Breadcrumb = { label: string; href?: string };

type Props = {
  breadcrumbs?: Breadcrumb[];
};

/** Lightweight breadcrumb bar shown on content list and edit pages. */
export function ContentAdminTabs({ breadcrumbs = [] }: Props) {
  const pathname = usePathname() ?? "";
  const isHub = pathname === "/admin/content";

  if (isHub || breadcrumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
      <Link href="/admin/content" className={cn("hover:text-foreground transition-colors")}>
        Content
      </Link>
      {breadcrumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span>/</span>
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
