"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; match: (pathname: string) => boolean };

const TABS: Tab[] = [
  {
    href: "/admin/content",
    label: "Content",
    match: (p) => p === "/admin/content" || p.startsWith("/admin/content/") && !p.startsWith("/admin/content/types"),
  },
  {
    href: "/admin/content/types",
    label: "Content Types",
    match: (p) => p === "/admin/content/types" || p.startsWith("/admin/content/types/"),
  },
];

export function ContentAdminTabs() {
  const pathname = usePathname() ?? "";

  return (
    <div className="w-full">
      <div className="inline-flex rounded-xl border bg-background p-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

