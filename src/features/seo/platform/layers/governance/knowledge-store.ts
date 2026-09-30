import { prisma } from "@/lib/prisma";
import { SEO_KNOWLEDGE_NAMESPACE } from "@/features/seo/constants";
import type { KnowledgeContext, KnowledgeEntry } from "../../types";

export async function loadKnowledgeContext(): Promise<KnowledgeContext> {
  try {
    const row = await prisma.jsonStore.findUnique({
      where: {
        namespace_key: { namespace: SEO_KNOWLEDGE_NAMESPACE, key: "entries" },
      },
    });
    const entries = (row?.data as KnowledgeEntry[] | undefined) ?? [];
    return { entries: Object.freeze([...entries]) };
  } catch {
    return { entries: Object.freeze([]) };
  }
}

export async function saveKnowledgeEntries(entries: KnowledgeEntry[]): Promise<void> {
  await prisma.jsonStore.upsert({
    where: {
      namespace_key: { namespace: SEO_KNOWLEDGE_NAMESPACE, key: "entries" },
    },
    create: {
      namespace: SEO_KNOWLEDGE_NAMESPACE,
      key: "entries",
      data: entries,
    },
    update: { data: entries },
  });
}
