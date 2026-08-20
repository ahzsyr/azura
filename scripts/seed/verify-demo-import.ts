import { PrismaClient } from "@prisma/client";
import { loadTranslationsMap } from "../../src/features/translation/bilingual-serialize";
import { resolveTranslation } from "../../src/features/translation/translation-resolver";

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.cmsPage.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });
  const translations = await loadTranslationsMap(
    "CmsPage",
    pages.map((p) => p.id)
  );
  const company = await prisma.companyInfo.findUnique({ where: { id: "default" } });
  const counts = {
    contentItems: await prisma.contentItem.count(),
    posts: await prisma.post.count(),
    galleries: await prisma.gallery.count(),
    testimonials: await prisma.testimonial.count(),
    faqSets: await prisma.faqSet.count(),
    formTemplates: await prisma.formTemplate.count(),
    mediaAssets: await prisma.mediaAsset.count(),
  };

  console.log("Company:", company?.name);
  console.log("Published pages:", pages.length);
  for (const p of pages) {
    const title = resolveTranslation("title", "en", {
      translations: translations.get(p.id) ?? [],
    });
    console.log(`  - ${p.slug}: ${title || p.slug}`);
  }
  console.log("Counts:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
