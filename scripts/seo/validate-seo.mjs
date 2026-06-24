#!/usr/bin/env node
/**
 * Validates SEO metadata records in the database.
 * Run after migrate/seed: npm run seo:validate
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATIC_PAGE_KEYS = [
  "home",
  "about",
  "packages",
  "visa",
  "hotels-transport",
  "gallery",
  "testimonials",
  "contact",
  "blog",
];

function issue(severity, code, message, target) {
  return { severity, code, message, target };
}

function validateMeta(record, target) {
  const problems = [];
  if (!record.titleEn?.trim()) problems.push(issue("error", "missing-title-en", "Missing English title", target));
  if (!record.descriptionEn?.trim()) {
    problems.push(issue("error", "missing-description-en", "Missing English description", target));
  }
  const titleLen = record.titleEn?.trim().length ?? 0;
  if (titleLen > 0 && (titleLen < 20 || titleLen > 70)) {
    problems.push(issue("warning", "title-length", `English title length ${titleLen} (aim 30–60)`, target));
  }
  const descLen = record.descriptionEn?.trim().length ?? 0;
  if (descLen > 0 && (descLen < 80 || descLen > 180)) {
    problems.push(issue("warning", "description-length", `English description length ${descLen} (aim 120–160)`, target));
  }
  if (!record.ogImageUrl?.trim()) {
    problems.push(issue("warning", "missing-og-image", "No OG image URL", target));
  }
  return problems;
}

async function main() {
  const issues = [];

  for (const pageKey of STATIC_PAGE_KEYS) {
    const meta = await prisma.seoMeta.findUnique({ where: { pageKey } });
    const legacy = meta ? null : await prisma.seoSettings.findUnique({ where: { pageKey } });
    const record = meta ?? legacy;
    if (!record) {
      issues.push(issue("warning", "missing-static-meta", `No SEO record for static page "${pageKey}"`, pageKey));
      continue;
    }
    issues.push(...validateMeta(record, `static:${pageKey}`));
  }

  const cmsPages = await prisma.cmsPage.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, seoMeta: true },
  });
  for (const page of cmsPages) {
    if (!page.seoMeta) {
      issues.push(issue("warning", "missing-cms-meta", `Published CMS page "${page.slug}" has no SeoMeta`, page.slug));
      continue;
    }
    issues.push(...validateMeta(page.seoMeta, `cms:${page.slug}`));
  }

  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, seoMeta: true },
  });
  for (const post of posts) {
    if (!post.seoMeta) {
      issues.push(issue("warning", "missing-post-meta", `Published post "${post.slug}" has no SeoMeta`, post.slug));
      continue;
    }
    issues.push(...validateMeta(post.seoMeta, `post:${post.slug}`));
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  console.log(`[seo:validate] static keys checked=${STATIC_PAGE_KEYS.length} cms=${cmsPages.length} posts=${posts.length}`);
  console.log(`[seo:validate] errors=${errors.length} warnings=${warnings.length}`);

  for (const item of issues) {
    console.log(`[${item.severity}] ${item.target} — ${item.code}: ${item.message}`);
  }

  await prisma.$disconnect();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error("[seo:validate] fatal:", error);
  await prisma.$disconnect();
  process.exit(1);
});
