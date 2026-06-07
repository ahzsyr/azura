import { notFound } from "next/navigation";
import { knowledgeBaseService } from "@/features/knowledge-base/service";
import { KnowledgeBaseEditPage } from "@/features/knowledge-base/admin/knowledge-base-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminKnowledgeBaseEditRoute({ params }: Props) {
  const { id } = await params;
  const knowledgeBase = await knowledgeBaseService.getByIdForAdmin(id);
  if (!knowledgeBase) notFound();
  return <KnowledgeBaseEditPage knowledgeBase={knowledgeBase} />;
}
