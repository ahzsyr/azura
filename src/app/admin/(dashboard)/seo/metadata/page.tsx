import { Suspense } from "react";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { listPageSeoContexts } from "@/features/seo/resolve-page-seo-context";
import { AdminSeoHub } from "@/features/seo/admin/admin-seo-hub";
import { listMetadataAttention } from "@/features/seo/operator/metadata-attention";
import { SeoMetadataAttention } from "@/features/seo/operator/components/seo-metadata-attention";

export const dynamic = "force-dynamic";

export default async function AdminSeoMetadataPage() {
  const staticPageKeys = STATIC_SEO_PAGES.map((page) => page.pageKey);

  let contextsByKey: Awaited<ReturnType<typeof listPageSeoContexts>> = {};
  try {
    contextsByKey = await listPageSeoContexts(staticPageKeys);
  } catch {
    // DB unavailable
  }

  const attention = await listMetadataAttention().catch(() => []);

  return (
    <div className="space-y-6 max-w-6xl">
      <SeoMetadataAttention items={attention} />
      <Suspense fallback={null}>
        <AdminSeoHub contextsByKey={contextsByKey} />
      </Suspense>
    </div>
  );
}
