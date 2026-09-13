import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getCompanyInfoCached = cache(async () => {
  return prisma.companyInfo.findUnique({ where: { id: "default" } });
});

export const getAdminDashboardStats = cache(async () => {
  const [contentItems, formSubmissions, posts, pages, media] = await Promise.all([
    prisma.contentItem.count({ where: { deletedAt: null, contentType: { slug: "catalog-items" } } }),
    prisma.formSubmission.count({ where: { status: "NEW" } }),
    prisma.post.count(),
    prisma.cmsPage.count(),
    prisma.mediaAsset.count(),
  ]);
  return { packages: contentItems, newFormSubmissions: formSubmissions, posts, pages, media };
});
