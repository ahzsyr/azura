import type { FaqSchemaItem } from "../types";

type BlockLike = {
  type?: string;
  props?: Record<string, unknown>;
  children?: BlockLike[];
};

export function collectFaqFromBlocks(
  blocks: BlockLike[] | undefined,
  resolveSet: (slug: string) => Promise<Array<{ question: string; answer: string }>>,
): Promise<FaqSchemaItem[]> {
  if (!blocks?.length) return Promise.resolve([]);

  return (async () => {
    const items: FaqSchemaItem[] = [];

    async function walk(nodes: BlockLike[]) {
      for (const block of nodes) {
        if (block.type === "faq") {
          const slug = String(block.props?.faqSetSlug ?? block.props?.category ?? "").trim();
          if (slug) {
            items.push(...(await resolveSet(slug)));
          }
        }
        if (block.type === "product-faq") {
          const manual = block.props?.items;
          if (Array.isArray(manual)) {
            for (const entry of manual) {
              if (
                typeof entry === "object" &&
                entry !== null &&
                "question" in entry &&
                "answer" in entry
              ) {
                const row = entry as { question?: string; answer?: string };
                if (row.question && row.answer) {
                  items.push({ question: row.question, answer: row.answer });
                }
              }
            }
          }
        }
        if (block.children?.length) await walk(block.children);
      }
    }

    await walk(blocks);
    return items;
  })();
}

export function dedupeFaqItems(items: FaqSchemaItem[]): FaqSchemaItem[] {
  const seen = new Set<string>();
  const result: FaqSchemaItem[] = [];
  for (const item of items) {
    const key = item.question.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}
