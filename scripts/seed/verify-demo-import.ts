import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.cmsPage.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, titleEn: true },
    orderBy: { slug: "asc" },
  });
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
  for (const p of pages) console.log(`  - ${p.slug}: ${p.titleEn}`);
  console.log("Counts:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
