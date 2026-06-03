"use client";

import Link from "next/link";
import { Package, MessageSquare, Star, Image } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AdminPageHeader,
  AdminCardGrid,
  AdminStaggerContainer,
  AdminStaggerItem,
} from "@/components/admin/layout/admin-shell";
import { getPublicBrandName } from "@/config/site";

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
};

type AdminDashboardClientProps = {
  stats: DashboardStats;
  platform: PlatformStats;
  recentInquiries: Inquiry[];
  rebuildSearchAction: () => void;
};

export function AdminDashboardClient({
  stats,
  platform,
  recentInquiries,
  rebuildSearchAction,
}: AdminDashboardClientProps) {
  const cards = [
    { label: "Packages", value: stats.packages, icon: Package, href: "/admin/packages" },
    { label: "New Inquiries", value: stats.newInquiries, icon: MessageSquare, href: "/admin/inquiries" },
    { label: "Testimonials", value: stats.testimonials, icon: Star, href: "/admin/testimonials" },
    { label: "Gallery Items", value: stats.gallery, icon: Image, href: "/admin/gallery" },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description={`Welcome to ${getPublicBrandName()} admin panel.`}
        actions={
          <form action={rebuildSearchAction}>
            <Button type="submit" variant="outline" size="sm">
              Rebuild search index
            </Button>
          </form>
        }
      />

      <p className="mb-6 text-sm text-muted-foreground">
        CMS: {platform.pages} pages · {platform.posts} posts · {platform.media} media assets
      </p>

      <AdminStaggerContainer>
        <AdminCardGrid columns={4}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <AdminStaggerItem key={card.label}>
                <Link href={card.href} className="block h-full">
                  <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                      <Icon className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold tabular-nums">{card.value}</p>
                    </CardContent>
                  </Card>
                </Link>
              </AdminStaggerItem>
            );
          })}
        </AdminCardGrid>

        <AdminStaggerItem className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inquiries</CardTitle>
            </CardHeader>
            <CardContent>
              {recentInquiries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inquiries yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentInquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{inquiry.name}</p>
                        <p className="text-sm text-muted-foreground">{inquiry.email}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {inquiry.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AdminStaggerItem>
      </AdminStaggerContainer>
    </div>
  );
}
