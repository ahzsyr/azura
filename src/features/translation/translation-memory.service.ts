import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

function hashSource(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export const translationMemoryService = {
  async lookup(
    sourceText: string,
    sourceLocale: string,
    targetLocale: string
  ): Promise<string | null> {
    const sourceHash = hashSource(sourceText);
    const row = await prisma.translationMemory.findUnique({
      where: {
        sourceHash_targetLocale: { sourceHash, targetLocale },
      },
    });
    if (!row || row.sourceLocale !== sourceLocale) return null;
    return row.targetText;
  },

  async store(
    sourceText: string,
    targetText: string,
    sourceLocale: string,
    targetLocale: string
  ) {
    const sourceHash = hashSource(sourceText);
    return prisma.translationMemory.upsert({
      where: {
        sourceHash_targetLocale: { sourceHash, targetLocale },
      },
      create: {
        sourceHash,
        sourceText,
        targetText,
        sourceLocale,
        targetLocale,
      },
      update: {
        sourceText,
        targetText,
        sourceLocale,
      },
    });
  },

  async lookupBatch(
    items: { sourceText: string; sourceLocale: string; targetLocale: string }[]
  ): Promise<(string | null)[]> {
    return Promise.all(
      items.map((item) =>
        this.lookup(item.sourceText, item.sourceLocale, item.targetLocale)
      )
    );
  },
};
