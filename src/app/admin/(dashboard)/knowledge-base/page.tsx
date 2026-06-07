import { knowledgeBaseService } from "@/features/knowledge-base/service";
import { KnowledgeBaseManager } from "@/features/knowledge-base/admin/knowledge-base-manager";

export default async function AdminKnowledgeBasePage() {
  let bases: Awaited<ReturnType<typeof knowledgeBaseService.listForAdmin>> = [];
  try {
    bases = await knowledgeBaseService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <KnowledgeBaseManager bases={bases} />;
}
