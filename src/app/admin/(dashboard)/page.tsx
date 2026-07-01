import { getDashboardStats } from "@/lib/data";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";
import { getAdminDashboardStats } from "@/services/loaders";
import { rebuildSearchIndex } from "@/capabilities/search/actions";
import { prisma } from "@/lib/prisma";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  let stats = { packages: 0, newInquiries: 0, testimonials: 0, gallery: 0 };
  let platform = { pages: 0, posts: 0, media: 0, packages: 0, newInquiries: 0 };
  let recentInquiries: Awaited<ReturnType<typeof prisma.inquiry.findMany>> = [];
  let customerCount = 0;
  let branding = { brandName: "Site", brandShort: "SI", tagline: "" };

  try {
    const [statsResult, platformResult, brand, inquiries, customers] = await Promise.all([
      getDashboardStats(),
      getAdminDashboardStats(),
      loadSiteBrandContext(),
      prisma.inquiry.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);
    stats = statsResult;
    platform = platformResult;
    branding = brand;
    recentInquiries = inquiries;
    customerCount = customers;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[admin/dashboard] load failed:", errMsg);
    try {
      branding = await loadSiteBrandContext();
    } catch {
      // DB unavailable
    }
  }

  return (
    <AdminDashboardClient
      branding={branding}
      stats={stats}
      platform={platform}
      customerCount={customerCount}
      recentInquiries={recentInquiries}
      rebuildSearchAction={rebuildSearchIndex}
    />
  );
}
