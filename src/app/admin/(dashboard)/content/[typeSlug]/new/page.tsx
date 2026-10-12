import { notFound } from "next/navigation";
import { ContentEditPage } from "@/features/content/admin/content-edit-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";
import { localeService } from "@/features/i18n/locale.service";
import { getEffectiveAvailabilityProfile } from "@/config/deployment-profile/site-features";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ typeSlug: string }> };

export default async function AdminContentNewPage({ params }: Props) {
  const { typeSlug } = await params;
  await contentService.ensureReady();

  const contentType = await contentRepository.getTypeBySlug(typeSlug);
  if (!contentType) notFound();

  const collections = await contentRepository.listCollections(contentType.id);
  const [locales, availability] = await Promise.all([
    localeService.listEnabled(),
    getEffectiveAvailabilityProfile(),
  ]);

  return (
    <ContentEditPage
      contentType={contentType}
      collections={collections}
      isNew
      locales={locales}
      blocksOwnerType="ContentItem"
      blocksOwnerId=""
      initialEditorBlocks={[]}
      availability={availability}
    />
  );
}
