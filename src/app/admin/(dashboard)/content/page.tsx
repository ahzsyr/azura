import { notFound } from "next/navigation";
import { ContentHubPage } from "@/features/content/admin/content-hub-page";
import { contentService } from "@/features/content/content.service";
import { contentRepository } from "@/features/content/content.repository";

export const dynamic = "force-dynamic";

export default async function AdminContentHubPage() {
  await contentService.ensureReady();
  const types = await contentRepository.listTypes();
  return <ContentHubPage types={types} />;
}
