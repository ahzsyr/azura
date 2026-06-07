import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { AdminSeoHub } from "@/features/seo/admin/admin-seo-hub";
import { ensureStaticSeoMetaRecords } from "@/features/seo/seo-static.service";

export default async function AdminSeoPage() {
  let pageMetas: Awaited<ReturnType<typeof seoRepository.listPageKeyMeta>> = [];
  let cmsCount = 0;
  let postCount = 0;

  try {
    await ensureStaticSeoMetaRecords();
    [pageMetas, cmsCount, postCount] = await Promise.all([
      seoRepository.listPageKeyMeta(),
      prisma.cmsPage.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);
  } catch {
    // DB not connected
  }

  const metaByKey = Object.fromEntries(
    pageMetas.filter((m) => m.pageKey).map((m) => [m.pageKey!, m]),
  );

  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl border bg-muted/40" />}>
      <AdminSeoHub metaByKey={metaByKey} cmsCount={cmsCount} postCount={postCount} />
    </Suspense>
  );
}
