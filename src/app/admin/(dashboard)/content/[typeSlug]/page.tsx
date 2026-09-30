import { notFound } from "next/navigation";
import { ContentListPage } from "@/features/content/admin/content-list-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
import { loadContentTypeWithLegacyFields, loadAdminRowsWithLocalizedFields } from "@/features/translation/admin-entity-helpers";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ typeSlug: string }>; searchParams: Promise<{ collection?: string }> };

export default async function AdminContentTypeListPage({ params, searchParams }: Props) {
  const { typeSlug } = await params;
  try {
    await contentService.ensureReady();

    const contentType = await contentRepository.getTypeBySlug(typeSlug);
    if (!contentType) notFound();
    const enrichedType = await loadContentTypeWithLegacyFields(contentType);
    const collectionsWithNames = await loadAdminRowsWithLocalizedFields(
      "ContentCollection",
      contentType.collections,
      ["name"],
      "name",
    );

    const items = await contentRepository.listItemsAsListRows(typeSlug);
    const { collection } = await searchParams;

    return (
      <ContentListPage
        contentType={enrichedType}
        items={items}
        initialCollection={collection ?? ""}
        collections={collectionsWithNames.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.displayTitle || row.slug,
        }))}
      />
    );
  } catch (error) {
    console.error(`[admin/content] list route failed (${typeSlug}):`, error);
    throw error;
  }
}
