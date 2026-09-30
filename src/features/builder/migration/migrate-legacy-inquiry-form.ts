import type { BlockNode, PageBlocks } from "@/types/builder";

function migrateBlock(block: BlockNode): BlockNode {
  if ((block.type as string) !== "inquiryForm") {
    const children = block.children?.map(migrateBlock);
    return children ? { ...block, children } : block;
  }

  const props = block.props ?? {};
  return {
    ...block,
    type: "contactFormBuilder",
    props: {
      title: props.title ?? "Contact us",
      titleEn: props.titleEn,
      titleAr: props.titleAr,
      templateId: "",
      layout: "stacked",
      successMessage: "Thank you! We will be in touch.",
      redirectUrl: "",
    },
  };
}

export function migrateLegacyInquiryFormBlocks(blocks: PageBlocks): PageBlocks {
  return blocks.map(migrateBlock);
}

export function inquiryFormBlocksWereMigrated(before: PageBlocks, after: PageBlocks): boolean {
  const countType = (nodes: PageBlocks, type: string) => {
    let count = 0;
    const walk = (list: PageBlocks) => {
      for (const block of list) {
        if (block.type === type) count += 1;
        if (block.children?.length) walk(block.children);
      }
    };
    walk(nodes);
    return count;
  };
  return countType(before, "inquiryForm") > countType(after, "inquiryForm");
}
