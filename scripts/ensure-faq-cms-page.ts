/**
 * Removes the deprecated wired /faq CMS index page (idempotent).
 * Individual FAQ sets at /faq/[slug] are unchanged.
 * Run: npm run cms:ensure-faq
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const slug = "faq";
  const existing = await prisma.cmsPage.findUnique({ where: { slug } });
  if (!existing) {
    console.log(`[ensure-faq-cms-page] no CmsPage slug=${slug} — nothing to remove`);
    return;
  }

  await prisma.cmsPage.update({
    where: { slug },
    data: { status: "DRAFT", publishedAt: null },
  });

  console.log(
    `[ensure-faq-cms-page] unpublished deprecated index page id=${existing.id} slug=${slug}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
