import { knowledgeBaseService } from "@/presets/knowledge/service";
import { KnowledgeBaseManager } from "@/presets/knowledge/admin/knowledge-base-manager";

export default async function AdminKnowledgeBasePage() {
  let bases: Awaited<ReturnType<typeof knowledgeBaseService.listForAdmin>> = [];
  try {
    bases = await knowledgeBaseService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <KnowledgeBaseManager bases={bases} />;
}
