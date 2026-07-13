import { notFound } from "next/navigation";
import { ContentListPage } from "@/features/content/admin/content-list-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
import { loadContentTypeWithLegacyFields } from "@/features/translation/admin-entity-helpers";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ typeSlug: string }> };

export default async function AdminContentTypeListPage({ params }: Props) {
  const { typeSlug } = await params;
  try {
    await contentService.ensureReady();

    const contentType = await contentRepository.getTypeBySlug(typeSlug);
    if (!contentType) notFound();
    const enrichedType = await loadContentTypeWithLegacyFields(contentType);

    const items = await contentRepository.listItemsAsListRows(typeSlug);

    return <ContentListPage contentType={enrichedType} items={items} />;
  } catch (error) {
    console.error(`[admin/content] list route failed (${typeSlug}):`, error);
    throw error;
  }
}
