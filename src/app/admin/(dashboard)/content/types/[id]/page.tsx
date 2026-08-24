import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContentTypeForm } from "@/features/content/admin/content-type-form";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { ContentAdminTabs } from "@/features/content/admin/content-admin-tabs";
import { loadContentTypeWithLegacyFields, readAdminDefaultLocaleField } from "@/features/translation/admin-entity-helpers";

type Props = { params: Promise<{ id: string }> };

export default async function EditContentTypePage({ params }: Props) {
  const { id } = await params;
  const contentType = await prisma.contentType.findUnique({ where: { id } });
  if (!contentType) notFound();
  const enriched = await loadContentTypeWithLegacyFields(contentType);

  return (
    <div className="space-y-6">
      <ContentAdminTabs
        breadcrumbs={[
          { label: "Types", href: "/admin/content?tab=types" },
          { label: readAdminDefaultLocaleField(enriched, "labelPlural", enriched.displayTitle) },
        ]}
      />
      <AdminPageHeader
        title={`Edit: ${readAdminDefaultLocaleField(enriched, "labelPlural", enriched.displayTitle)}`}
        description={contentType.slug}
      />
      <ContentTypeForm contentType={enriched} />
    </div>
  );
}
