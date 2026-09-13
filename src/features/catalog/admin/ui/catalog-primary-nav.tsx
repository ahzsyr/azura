"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Layers,
  ListFilter,
  MoreHorizontal,
  Package,
  RefreshCw,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CATALOG_WORKSPACE_NAV,
  type CatalogWorkspaceNavId,
} from "../catalog-workspace-nav";

const ICONS: Record<CatalogWorkspaceNavId, LucideIcon> = {
  products: Package,
  categories: Layers,
  brands: Tags,
  navigation: Compass,
  filters: ListFilter,
  sync: RefreshCw,
  settings: Settings,
};

type CatalogPrimaryNavProps = {
  className?: string;
};

export function CatalogPrimaryNav({ className }: CatalogPrimaryNavProps) {
  const pathname = usePathname() ?? "";

  const activeId =
    CATALOG_WORKSPACE_NAV.find((item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.id ?? null;

  const primary = CATALOG_WORKSPACE_NAV.slice(0, 4);
  const overflow = CATALOG_WORKSPACE_NAV.slice(4);

  return (
    <nav
      className={cn(
        "flex items-stretch gap-1 overflow-x-auto rounded-xl border border-border/70 bg-background p-1.5",
        className,
      )}
      aria-label="Catalog workspace"
    >
      {primary.map((item) => {
        const Icon = ICONS[item.id];
        const active = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "inline-flex min-w-[5.5rem] flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              active
                ? "bg-primary/[0.1] text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="ms-auto hidden items-stretch gap-1 md:flex">
        {overflow.map((item) => {
          const Icon = ICONS[item.id];
          const active = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "inline-flex min-w-[5rem] flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-primary/[0.1] text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="ms-auto md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "inline-flex h-full min-w-[3rem] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/70",
              overflow.some((i) => i.id === activeId) && "bg-primary/[0.1] text-foreground",
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span>More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map((item) => (
              <DropdownMenuItem key={item.id} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
