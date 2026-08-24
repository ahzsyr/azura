/**
 * Migrate legacy inquiryForm blocks to contactFormBuilder + FormTemplate.
 *
 * Run: npx tsx scripts/forms/migrate-inquiry-form-blocks.ts
 * Options:
 *   --dry-run   Preview changes without writing
 */
import { PrismaClient } from "@prisma/client";
import { legacyInquiryToStoredDefinition } from "../../src/features/forms/adapters/legacy-inquiry-migration";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

type Block = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: Block[];
};

function walkBlocks(blocks: Block[], visitor: (block: Block, path: number[]) => void, path: number[] = []) {
  blocks.forEach((block, index) => {
    visitor(block, [...path, index]);
    if (Array.isArray(block.children)) {
      walkBlocks(block.children, visitor, [...path, index]);
    }
  });
}

function migrateBlock(block: Block, templateId: string): Block {
  if (block.type !== "inquiryForm") return block;
  return {
    ...block,
    type: "contactFormBuilder",
    props: {
      title: block.props?.title ?? "Contact us",
      templateId,
      layout: "stacked",
      successMessage: "Thank you! We will be in touch.",
      redirectUrl: "",
    },
  };
}

function migrateBlocksTree(blocks: Block[], templateId: string): Block[] {
  return blocks.map((block) => {
    const next = migrateBlock(block, templateId);
    if (Array.isArray(next.children)) {
      return { ...next, children: migrateBlocksTree(next.children, templateId) };
    }
    return next;
  });
}

function countInquiryForms(blocks: Block[]): number {
  let count = 0;
  walkBlocks(blocks, (block) => {
    if (block.type === "inquiryForm") count += 1;
  });
  return count;
}

async function ensureContactTemplate(): Promise<string> {
  const slug = "legacy-inquiry-contact";
  const existing = await prisma.formTemplate.findUnique({ where: { slug } });
  if (existing) return existing.id;

  const definition = legacyInquiryToStoredDefinition();
  if (dryRun) {
    console.log("  [dry-run] Would create FormTemplate:", slug);
    return "dry-run-template-id";
  }

  const created = await prisma.formTemplate.create({
    data: {
      name: "Legacy Inquiry Contact",
      slug,
      category: "CONTACT",
      description: "Auto-migrated from inquiryForm blocks",
      definition: definition as object,
      isPublished: true,
    },
  });
  console.log("  Created FormTemplate:", created.id, slug);
  return created.id;
}

async function migrateCmsPages(templateId: string) {
  const pages = await prisma.cmsPage.findMany({ select: { id: true, slug: true, blocks: true } });
  let updated = 0;

  for (const page of pages) {
    const blocks = (page.blocks as Block[]) ?? [];
    const count = countInquiryForms(blocks);
    if (count === 0) continue;

    const nextBlocks = migrateBlocksTree(blocks, templateId);
    console.log(`  Page ${page.slug}: ${count} inquiryForm block(s)`);

    if (!dryRun) {
      await prisma.cmsPage.update({
        where: { id: page.id },
        data: { blocks: nextBlocks as object },
      });
    }
    updated += count;
  }

  return updated;
}

async function main() {
  console.log(dryRun ? "\n--- DRY RUN ---" : "\n--- Migrating inquiryForm blocks ---");
  const templateId = await ensureContactTemplate();
  const migrated = await migrateCmsPages(templateId);
  console.log(`\nDone. Migrated ${migrated} inquiryForm block(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
