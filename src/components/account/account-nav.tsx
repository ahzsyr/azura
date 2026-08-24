"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
};

const LINKS = [
  { sub: "", key: "navOverview" as const, href: (l: string) => `/${l}/account` },
  {
    sub: "requests",
    key: "navRequests" as const,
    href: (l: string) => `/${l}/account/requests`,
  },
  {
    sub: "favorites",
    key: "navFavorites" as const,
    href: (l: string) => `/${l}/account/favorites`,
  },
  {
    sub: "bookings",
    key: "navBookings" as const,
    href: (l: string) => `/${l}/account/bookings`,
  },
  {
    sub: "notifications",
    key: "navNotifications" as const,
    href: (l: string) => `/${l}/account/notifications`,
  },
  {
    sub: "profile",
    key: "navProfile" as const,
    href: (l: string) => `/${l}/account/profile`,
  },
  {
    sub: "security",
    key: "navSecurity" as const,
    href: (l: string) => `/${l}/account/security`,
  },
];

export function AccountNav({ locale }: Props) {
  const t = useTranslations("account");
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Account">
      {LINKS.map((link) => {
        const href = link.href(locale);
        const active =
          link.sub === ""
            ? pathname === href || pathname === `/${locale}/account/`
            : pathname.startsWith(href);
        return (
          <Button
            key={link.key}
            asChild
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn(!active && "text-muted-foreground")}
          >
            <Link href={href}>{t(link.key)}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
