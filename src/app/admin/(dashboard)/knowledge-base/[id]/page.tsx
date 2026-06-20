import { notFound } from "next/navigation";
import { knowledgeBaseService } from "@/features/knowledge-base/service";
import { loadKnowledgeBaseFormDrafts } from "@/features/knowledge-base/admin/knowledge-base-form-data";
import { KnowledgeBaseEditPage } from "@/features/knowledge-base/admin/knowledge-base-edit-page";
import { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";

type Props = { params: Promise<{ id: string }> };

export default async function AdminKnowledgeBaseEditRoute({ params }: Props) {
  const { id } = await params;
  const knowledgeBase = await knowledgeBaseService.getByIdForAdmin(id);
  if (!knowledgeBase) notFound();
  const [displayTitle, formDrafts] = await Promise.all([
    loadAdminDisplayTitle("KnowledgeBase", id, "title", knowledgeBase.slug),
    loadKnowledgeBaseFormDrafts(knowledgeBase),
  ]);
  return (
    <KnowledgeBaseEditPage
      knowledgeBase={knowledgeBase}
      displayTitle={displayTitle}
      formDrafts={formDrafts}
    />
  );
}
