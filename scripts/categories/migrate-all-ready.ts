/**
 * Run all Category scope migrations (idempotent).
 * Usage: npx tsx scripts/categories/migrate-all-ready.ts
 *
 * Requires: prisma migrate deploy for Category tables + DATABASE_URL.
 */
import { migrateProductCategories } from "@/features/categories/migration/migrate-product-categories";
import { migratePostCategories } from "@/features/categories/migration/migrate-post-categories";
import { migrateContentCategories } from "@/features/categories/migration/migrate-content-categories";
import { migratePortalCategories } from "@/features/categories/migration/migrate-portal-categories";
import { migrateTestimonialCategories } from "@/features/categories/migration/migrate-testimonial-categories";

async function main() {
  console.log("=== PRODUCT ===");
  const product = await migrateProductCategories();
  console.log(JSON.stringify(product, null, 2));

  console.log("=== POST ===");
  const post = await migratePostCategories();
  console.log(JSON.stringify(post, null, 2));

  console.log("=== CONTENT ===");
  const content = await migrateContentCategories();
  console.log(JSON.stringify(content, null, 2));

  console.log("=== PORTAL (KNOWLEDGE + PARTNER) ===");
  const portal = await migratePortalCategories();
  console.log(JSON.stringify(portal, null, 2));

  console.log("=== TESTIMONIAL ===");
  const testimonial = await migrateTestimonialCategories();
  console.log(JSON.stringify(testimonial, null, 2));

  const errors = [
    ...product.errors,
    ...post.errors,
    ...content.errors,
    ...portal.errors,
    ...testimonial.errors,
  ];
  if (errors.length) {
    console.error(`${errors.length} error(s)`);
    process.exitCode = 1;
  } else {
    console.log("All scope migrations completed without errors.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
