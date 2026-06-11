import { notFound } from "next/navigation";
import { ContentListPage } from "@/features/content/admin/content-list-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ typeSlug: string }> };

export default async function AdminContentTypeListPage({ params }: Props) {
  const { typeSlug } = await params;
  await contentService.ensureReady();

  const contentType = await contentRepository.getTypeBySlug(typeSlug);
  if (!contentType) notFound();

  const rows = await contentRepository.listItems(typeSlug);
  const items = rows.map((row: (typeof rows)[number]) =>
    contentRepository.toListItem(row, typeSlug)
  );

  return <ContentListPage contentType={contentType} items={items} />;
}
