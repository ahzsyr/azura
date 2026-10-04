#!/usr/bin/env node
/**
 * Post-deploy ISR warm-up.
 * Requests critical localized routes so the first real user visit is not stale build HTML.
 *
 * Usage:
 *   WARMUP_BASE_URL=https://your-hostinger-domain.example npm run deploy:warmup
 *
 * Optional product detail warm-up:
 *   WARMUP_BASE_URL=https://your-hostinger-domain.example WARMUP_PRODUCT_SLUGS=alfa-2-4-5ghz-indoor-antenna npm run deploy:warmup
 */
const baseUrl = (() => {
  const explicit = process.env.WARMUP_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/$/, "");
  return "http://localhost:3000";
})();

const localePrefixes = ["en"];

const paths = [
  "/en",
  "/ar",
  "/en/products",
  "/en/collections",
  "/en/about",
  "/en/contact",
  "/en/services",
  "/ar/products",
  "/ar/collections",
  "/ar/about",
  "/ar/contact",
  "/ar/services",
];

const productSlugs = (process.env.WARMUP_PRODUCT_SLUGS ?? "")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

for (const slug of productSlugs) {
  for (const locale of localePrefixes) {
    paths.push(`/${locale}/products/${slug}`);
  }
}

async function warm(path) {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    console.log(`[warmup] ${res.status} ${url}`);
  } catch (err) {
    console.warn(`[warmup] FAIL ${url}:`, err instanceof Error ? err.message : err);
  }
}

console.log(`[warmup] base=${baseUrl} paths=${paths.length}`);
for (const path of paths) {
  await warm(path);
}
console.log("[warmup] done");
