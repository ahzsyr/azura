"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ADMIN_DASHBOARD,
  filterNavItems,
  findNavGroupIdByPath,
} from "@/config/admin-nav";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SITE_PRODUCT_NAME } from "@/config/site";
import { AdminAccordionContent } from "./admin-motion";
import { useConstrainedMotion, ADMIN_MOTION_MOBILE } from "@/hooks/use-constrained-motion";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  const setSidebarMobileOpen = useAdminUiStore((s) => s.setSidebarMobileOpen);

  const link = (
    <Link
      href={href}
      onClick={() => setSidebarMobileOpen(false)}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        "hover:bg-muted hover:text-foreground",
        active
          ? "bg-primary/10 text-primary before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:rounded-full before:bg-primary"
          : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const navSearchQuery = useAdminUiStore((s) => s.navSearchQuery);
  const setNavSearchQuery = useAdminUiStore((s) => s.setNavSearchQuery);
  const expandedGroups = useAdminUiStore((s) => s.expandedGroups);
  const toggleGroupExpanded = useAdminUiStore((s) => s.toggleGroupExpanded);
  const expandOnlyNavGroup = useAdminUiStore((s) => s.expandOnlyNavGroup);

  const isSearching = Boolean(navSearchQuery.trim());
  const activeGroupId = findNavGroupIdByPath(pathname);
  const filteredGroups = filterNavItems(navSearchQuery);
  const DashboardIcon = ADMIN_DASHBOARD.icon;

  useEffect(() => {
    if (isSearching) return;
    expandOnlyNavGroup(activeGroupId);
  }, [pathname, isSearching, activeGroupId, expandOnlyNavGroup]);

  return (
    <>
      <div className={cn("flex h-14 shrink-0 items-center border-b px-4", collapsed && "justify-center px-2")}>
        {collapsed ? (
          <Link href="/admin" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            SM
          </Link>
        ) : (
          <div className="min-w-0">
            <Link href="/admin" className="font-heading text-base font-bold tracking-tight text-foreground">
              {SITE_PRODUCT_NAME}
            </Link>
            <p className="text-[11px] text-muted-foreground">Admin</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={navSearchQuery}
              onChange={(e) => setNavSearchQuery(e.target.value)}
              placeholder="Filter navigation…"
              className="h-8 ps-8 text-xs"
              aria-label="Filter navigation"
            />
            {isSearching ? (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Matching groups expanded
              </p>
            ) : null}
          </div>
        </div>
      )}

      <ScrollArea type="always" className="az-scroll-thin flex-1 px-2">
        <nav className="space-y-1 pb-4">
          <NavLink
            href={ADMIN_DASHBOARD.href}
            label={ADMIN_DASHBOARD.label}
            icon={DashboardIcon}
            active={isActive(pathname, ADMIN_DASHBOARD.href)}
            collapsed={collapsed}
          />

          <Separator className="my-2" />

          {filteredGroups.map(({ group, items }) => {
            const expanded = isSearching || expandedGroups[group.id] === true;
            const hasActiveItem = items.some((item) => isActive(pathname, item.href));

            return (
              <div key={group.id} className="mb-1">
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isSearching) return;
                      toggleGroupExpanded(group.id);
                    }}
                    disabled={isSearching}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                      expanded
                        ? "bg-muted/60 text-foreground"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      isSearching && "cursor-default opacity-90"
                    )}
                    aria-expanded={expanded}
                  >
                    <span className="flex items-center gap-2">
                      {group.label}
                      {hasActiveItem && !isSearching ? (
                        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                      ) : null}
                    </span>
                    <motion.span
                      animate={{ rotate: expanded ? 0 : -90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.span>
                  </button>
                )}

                <AdminAccordionContent open={expanded || collapsed}>
                  <div className={cn("space-y-0.5", !collapsed && expanded && "border-s border-muted/80 ps-2 ms-2")}>
                    {items.map((item) => (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={isActive(pathname, item.href)}
                        collapsed={collapsed}
                      />
                    ))}
                  </div>
                </AdminAccordionContent>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="shrink-0 border-t p-2">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
          >
            <LogOut className="me-2 h-4 w-4" />
            Sign out
          </Button>
        )}
      </div>
    </>
  );
}

export function AdminSidebar() {
  const sidebarCollapsed = useAdminUiStore((s) => s.sidebarCollapsed);
  const sidebarMobileOpen = useAdminUiStore((s) => s.sidebarMobileOpen);
  const toggleSidebarCollapsed = useAdminUiStore((s) => s.toggleSidebarCollapsed);
  const setSidebarMobileOpen = useAdminUiStore((s) => s.setSidebarMobileOpen);
  const { shouldReduceMotion, shouldSimplifyMotion } = useConstrainedMotion();

  const mobileDrawerTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        duration: shouldSimplifyMotion ? ADMIN_MOTION_MOBILE.enterDuration : 0.22,
        ease: [0.22, 1, 0.36, 1] as const,
      };

  return (
    <TooltipProvider>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 56 : 256 }}
        transition={{ duration: shouldSimplifyMotion ? 0.16 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden h-screen shrink-0 flex-col border-r admin-liquid-glass md:flex"
      >
        <Button
          variant="outline"
          size="icon"
          className="absolute -end-3 top-[18px] z-30 h-6 w-6 rounded-full border bg-background shadow-sm"
          onClick={toggleSidebarCollapsed}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
        <SidebarContent collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* Mobile drawer overlay */}
      {sidebarMobileOpen && (
        <div
          className="admin-mobile-overlay fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarMobileOpen(false)}
          aria-hidden
        />
      )}

      <motion.aside
        initial={false}
        animate={{ x: sidebarMobileOpen ? 0 : -280 }}
        transition={mobileDrawerTransition}
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-[280px] flex-col border-r bg-[var(--admin-surface)] shadow-xl md:hidden",
          !shouldSimplifyMotion && "admin-liquid-glass",
        )}
      >
        <div className="flex items-center justify-end p-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarMobileOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarContent collapsed={false} />
      </motion.aside>
    </TooltipProvider>
  );
}

export function AdminMobileMenuButton() {
  const setSidebarMobileOpen = useAdminUiStore((s) => s.setSidebarMobileOpen);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={() => setSidebarMobileOpen(true)}
      aria-label="Open navigation menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
