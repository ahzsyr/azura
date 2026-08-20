import "server-only";

import { prisma } from "@/lib/prisma";

export type ContentBuilderOverviewStats = Record<string, number>;

async function safeCount(run: () => Promise<number>): Promise<number> {
  try {
    return await run();
  } catch {
    return 0;
  }
}

/** Record counts keyed by admin href for Content Builder overview cards. */
export async function loadContentBuilderOverviewStats(): Promise<ContentBuilderOverviewStats> {
  const [
    pages,
    posts,
    contentItems,
    products,
    categories,
    team,
    partners,
    knowledge,
    plans,
    releases,
    faqs,
    testimonials,
    galleries,
    calculators,
  ] = await Promise.all([
    safeCount(() => prisma.cmsPage.count()),
    safeCount(() => prisma.post.count()),
    safeCount(() => prisma.contentItem.count({ where: { deletedAt: null } })),
    safeCount(() => prisma.product.count()),
    safeCount(() => prisma.catalogCollection.count()),
    safeCount(() => prisma.teamMember.count()),
    safeCount(() => prisma.partner.count()),
    safeCount(() => prisma.knowledgeArticle.count()),
    safeCount(() => prisma.pricingPlan.count()),
    safeCount(() => prisma.release.count()),
    safeCount(() => prisma.faqSet.count()),
    safeCount(() => prisma.testimonial.count()),
    safeCount(() => prisma.gallery.count()),
    safeCount(() => prisma.pricingCalculator.count()),
  ]);

  return {
    "/admin/pages": pages,
    "/admin/posts": posts,
    "/admin/content": contentItems,
    "/admin/products": products,
    "/admin/categories": categories,
    "/admin/team": team,
    "/admin/partners": partners,
    "/admin/knowledge-base": knowledge,
    "/admin/pricing-plans": plans,
    "/admin/releases": releases,
    "/admin/faqs": faqs,
    "/admin/testimonials": testimonials,
    "/admin/gallery": galleries,
    "/admin/pricing-calculators": calculators,
  };
}
