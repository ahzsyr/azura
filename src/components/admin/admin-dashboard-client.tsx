"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Image,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Package,
  Palette,
  Search,
  Star,
  UserCog,
  Users,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogoImage } from "@/features/navigation/components/header/brand-logo-image";
import {
  AdminCardGrid,
  AdminStaggerContainer,
  AdminStaggerItem,
} from "@/components/admin/layout/admin-shell";
import { formatAdminDate } from "@/lib/admin-date-format";
import { cn } from "@/lib/utils";

type DashboardStats = {
  packages: number;
  newInquiries: number;
  testimonials: number;
  gallery: number;
};

type PlatformStats = {
  pages: number;
  posts: number;
  media: number;
  packages: number;
  newInquiries: number;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date | string;
};

type Branding = {
  brandName: string;
  brandShort: string;
  tagline: string;
  logoUrl: string;
};

type AdminDashboardClientProps = {
  branding: Branding;
  stats: DashboardStats;
  platform: PlatformStats;
  customerCount: number;
  recentInquiries: Inquiry[];
  rebuildSearchAction: () => void;
};

const QUICK_ACTIONS = [
  { label: "Pages", href: "/admin/pages", icon: FileText, description: "CMS pages" },
  { label: "New inquiry", href: "/admin/inquiries", icon: MessageSquare, description: "Lead inbox" },
  { label: "Theme Studio", href: "/admin/theme", icon: Palette, description: "Look & feel, presets, preview" },
  { label: "Site access", href: "/admin/settings/site", icon: EyeOff, description: "Coming soon mode" },
  { label: "Visitor portal", href: "/admin/settings/portal", icon: UserCog, description: "Registration & reset" },
  { label: "Customers", href: "/admin/users", icon: Users, description: "Visitor accounts" },
  { label: "Search", href: "/admin/settings/search", icon: Search, description: "Index & ranking" },
] as const;

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card
        className={cn(
          "h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
          accent && "border-primary/30 bg-primary/[0.03]"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <Icon className={cn("size-4", accent ? "text-primary" : "text-muted-foreground")} />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AdminDashboardClient({
  branding,
  stats,
  platform,
  customerCount,
  recentInquiries,
  rebuildSearchAction,
}: AdminDashboardClientProps) {
  const { brandName, brandShort, tagline, logoUrl } = branding;

  const catalogCards = [
    { label: "Packages", value: stats.packages, icon: Package, href: "/admin/packages" },
    { label: "New inquiries", value: stats.newInquiries, icon: MessageSquare, href: "/admin/inquiries", accent: true },
    { label: "Testimonials", value: stats.testimonials, icon: Star, href: "/admin/testimonials" },
    { label: "Gallery", value: stats.gallery, icon: Image, href: "/admin/gallery" },
  ];

  const platformCards = [
    { label: "CMS pages", value: platform.pages, icon: FileText, href: "/admin/pages" },
    { label: "Blog posts", value: platform.posts, icon: Newspaper, href: "/admin/posts" },
    { label: "Media assets", value: platform.media, icon: Image, href: "/admin/media" },
    { label: "Customers", value: customerCount, icon: Users, href: "/admin/users" },
  ];

  return (
    <div className="space-y-8">
      <Card
        className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/8 via-[var(--admin-surface)] to-[var(--admin-surface)]"
      >
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-sm">
              {logoUrl ? (
                <BrandLogoImage
                  src={logoUrl}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-xl object-contain"
                />
              ) : (
                <span className="text-lg font-bold text-primary-foreground" aria-hidden>
                  {brandShort}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Admin dashboard
              </p>
              <h2 className="font-heading mt-1 truncate text-2xl font-semibold tracking-tight md:text-3xl">
                {brandName}
              </h2>
              {tagline ? (
                <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{tagline}</p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">
                Overview of content, leads, and platform activity.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="default" size="sm">
              <Link href="/admin/inquiries">
                View inquiries
                <ArrowRight className="ms-2 size-4" aria-hidden />
              </Link>
            </Button>
            <form action={rebuildSearchAction}>
              <Button type="submit" variant="outline" size="sm">
                Rebuild search
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <AdminStaggerContainer>
        <section className="space-y-4">
          <div className="admin-section-heading flex items-center gap-2">
            <LayoutDashboard className="size-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Catalog & engagement</h3>
          </div>
          <AdminCardGrid columns={4}>
            {catalogCards.map((card) => (
              <AdminStaggerItem key={card.label}>
                <StatCard {...card} />
              </AdminStaggerItem>
            ))}
          </AdminCardGrid>
        </section>

        <section className="space-y-4">
          <div className="admin-section-heading flex items-center gap-2">
            <FileText className="size-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold">Platform</h3>
          </div>
          <AdminCardGrid columns={4}>
            {platformCards.map((card) => (
              <AdminStaggerItem key={card.label}>
                <StatCard {...card} />
              </AdminStaggerItem>
            ))}
          </AdminCardGrid>
        </section>

        <section className="space-y-4">
          <h3 className="admin-section-heading text-sm font-semibold">Quick actions</h3>
          <AdminCardGrid columns={3}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <AdminStaggerItem key={action.href}>
                  <Link href={action.href} className="block h-full">
                    <Card className="h-full transition-colors hover:bg-muted/40">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-primary" aria-hidden />
                          <CardTitle className="text-base">{action.label}</CardTitle>
                        </div>
                        <CardDescription>{action.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </AdminStaggerItem>
              );
            })}
          </AdminCardGrid>
        </section>

        <AdminStaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Recent inquiries</CardTitle>
                <CardDescription>Latest contact and lead submissions</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/inquiries">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentInquiries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inquiries yet.</p>
              ) : (
                <ul className="divide-y divide-[var(--admin-border)] rounded-lg border border-[var(--admin-border)]">
                  {recentInquiries.map((inquiry) => (
                    <li key={inquiry.id}>
                      <Link
                        href={`/admin/inquiries/${inquiry.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{inquiry.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{inquiry.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {formatAdminDate(inquiry.createdAt)}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {inquiry.status}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </AdminStaggerItem>
      </AdminStaggerContainer>
    </div>
  );
}
