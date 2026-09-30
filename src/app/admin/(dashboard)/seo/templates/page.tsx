import "@/features/seo/platform/seo-platform.impl";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoRepository } from "@/repositories/seo.repository";
import { SearchAppearanceForm } from "@/features/seo/admin/search-appearance-form";

export default async function AdminSeoTemplatesPage() {
  const appearance = await seoRepository.getAppearanceConfig();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Search Appearance"
        description="Editable title and description patterns for public HTML metadata."
      />
      <SearchAppearanceForm initialConfig={appearance} />
    </div>
  );
}
