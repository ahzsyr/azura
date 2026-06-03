import { getDashboardStats } from "@/lib/data";
import { getAdminDashboardStats } from "@/services/loaders";
import { rebuildSearchIndex } from "@/features/search/actions";
import { prisma } from "@/lib/prisma";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export default async function AdminDashboardPage() {
  let stats = { packages: 0, newInquiries: 0, testimonials: 0, gallery: 0 };
  let platform = { pages: 0, posts: 0, media: 0, packages: 0, newInquiries: 0 };
  let recentInquiries: Awaited<ReturnType<typeof prisma.inquiry.findMany>> = [];

  try {
    [stats, platform] = await Promise.all([getDashboardStats(), getAdminDashboardStats()]);
    recentInquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  } catch {
    // DB not connected
  }

  return (
    <AdminDashboardClient
      stats={stats}
      platform={platform}
      recentInquiries={recentInquiries}
      rebuildSearchAction={rebuildSearchIndex}
    />
  );
}
