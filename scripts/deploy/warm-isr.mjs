#!/usr/bin/env node
/**
 * Post-deploy ISR warm-up.
 * Requests critical localized routes so the first real user visit is not stale build HTML.
 *
 * Usage:
 *   WARMUP_BASE_URL=https://brt-me.vercel.app npm run deploy:warmup
 *
 * Optional product detail warm-up:
 *   WARMUP_BASE_URL=https://brt-me.vercel.app WARMUP_PRODUCT_SLUGS=alfa-2-4-5ghz-indoor-antenna npm run deploy:warmup
 */
const baseUrl = (() => {
  const explicit = process.env.WARMUP_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
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
  for (const prefix of localePrefixes) {
    paths.push(`/${prefix}/products/${slug}`);
  }
}

async function warmPath(path) {
  const url = `${baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "brt-deploy-warmup/1.0" },
      redirect: "follow",
    });
    console.log(`${path} → ${res.status}`);
    return res.ok;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${path} → failed (${message})`);
    return false;
  }
}

console.log(`Warming ISR routes at ${baseUrl}…`);
if (productSlugs.length > 0) {
  console.log(`Including product slugs: ${productSlugs.join(", ")}`);
}
let ok = 0;
for (const path of paths) {
  if (await warmPath(path)) ok += 1;
}
console.log(`Warm-up complete: ${ok}/${paths.length} routes succeeded.`);
if (ok === 0) {
  process.exit(1);
}
