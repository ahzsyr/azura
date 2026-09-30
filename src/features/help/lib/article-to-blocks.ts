import type { HelpBlock } from "@/features/help/types";
import type { HelpEntityDefinition } from "@/features/help/inventory/types";

let blockSeq = 0;
function bid(prefix: string): string {
  blockSeq += 1;
  return `${prefix}-${blockSeq}`;
}

/** Reset sequence (useful in tests). */
export function resetArticleBlockIds(): void {
  blockSeq = 0;
}

export function definitionToBlocks(
  def: HelpEntityDefinition,
  options?: { includeTitleHeading?: boolean; idPrefix?: string }
): HelpBlock[] {
  const p = options?.idPrefix ?? def.id;
  const blocks: HelpBlock[] = [];

  if (options?.includeTitleHeading) {
    blocks.push({ id: bid(`${p}-h`), type: "heading", level: 3, text: def.title });
  }

  blocks.push({ id: bid(`${p}-sum`), type: "paragraph", text: def.summary });

  if (def.purpose) {
    blocks.push({ id: bid(`${p}-purpose`), type: "purpose", text: def.purpose });
  }
  if (def.whenToUse?.length) {
    blocks.push({ id: bid(`${p}-when`), type: "when_to_use", items: def.whenToUse });
  }
  if (def.prerequisites?.length) {
    blocks.push({ id: bid(`${p}-pre`), type: "prerequisites", items: def.prerequisites });
  }
  if (def.recommended || def.example) {
    blocks.push({
      id: bid(`${p}-field`),
      type: "field",
      name: def.title,
      purpose: def.purpose ?? def.summary,
      recommended: def.recommended,
      example: def.example,
      mistakes: def.mistakes,
    });
  }
  if (def.configurationSteps?.length) {
    blocks.push({ id: bid(`${p}-cfg-h`), type: "heading", level: 3, text: "Configuration guide" });
    blocks.push({ id: bid(`${p}-cfg`), type: "steps", items: def.configurationSteps });
  }
  if (def.bestPractices?.length) {
    blocks.push({ id: bid(`${p}-bp`), type: "best_practices", items: def.bestPractices });
  }
  if (def.mistakes?.length && !def.recommended) {
    blocks.push({ id: bid(`${p}-mis`), type: "mistakes", items: def.mistakes });
  }
  if (def.warnings?.length) {
    for (const w of def.warnings) {
      blocks.push({ id: bid(`${p}-warn`), type: "warning", text: w });
    }
  }
  if (def.troubleshooting?.length) {
    blocks.push({
      id: bid(`${p}-ts`),
      type: "troubleshooting_list",
      items: def.troubleshooting,
    });
  }
  if (def.faq?.length) {
    blocks.push({ id: bid(`${p}-faq`), type: "faq", items: def.faq });
  }

  return blocks;
}
