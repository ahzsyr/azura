import { notFound } from "next/navigation";
import { ContentListPage } from "@/features/content/admin/content-list-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
import { loadContentTypeWithLegacyFields } from "@/features/translation/admin-entity-helpers";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ typeSlug: string }> };

export default async function AdminContentTypeListPage({ params }: Props) {
  const { typeSlug } = await params;
  await contentService.ensureReady();

  const contentType = await contentRepository.getTypeBySlug(typeSlug);
  if (!contentType) notFound();
  const enrichedType = await loadContentTypeWithLegacyFields(contentType);

  const rows = await contentRepository.listItemsAsListRows(typeSlug);
  const items = rows;

  return <ContentListPage contentType={enrichedType} items={items} />;
}
