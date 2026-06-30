import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getCompanyInfoCached = cache(async () => {
  return prisma.companyInfo.findUnique({ where: { id: "default" } });
});

export const getAdminDashboardStats = cache(async () => {
  const [contentItems, inquiries, posts, pages, media] = await Promise.all([
    prisma.contentItem.count({ where: { deletedAt: null, contentType: { slug: "catalog-items" } } }),
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.post.count(),
    prisma.cmsPage.count(),
    prisma.mediaAsset.count(),
  ]);
  return { packages: contentItems, newInquiries: inquiries, posts, pages, media };
});
