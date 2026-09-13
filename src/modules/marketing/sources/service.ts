import "server-only";
import { prisma } from "@/lib/prisma";
import { mapUtmSourceToKey, classifyTrafficType } from "@/modules/marketing/sources/keys";

export { mapUtmSourceToKey, classifyTrafficType };

const DEFAULT_SOURCES = [
  { key: "meta_ads", label: "Meta Ads", category: "paid", sortOrder: 10 },
  { key: "google_ads", label: "Google Ads", category: "paid", sortOrder: 20 },
  { key: "linkedin_ads", label: "LinkedIn Ads", category: "paid", sortOrder: 30 },
  { key: "instagram_ads", label: "Instagram Ads", category: "paid", sortOrder: 40 },
  { key: "organic_search", label: "Organic Search", category: "organic", sortOrder: 50 },
  { key: "direct", label: "Direct", category: "direct", sortOrder: 60 },
  { key: "referral", label: "Referral", category: "referral", sortOrder: 70 },
  { key: "email", label: "Email", category: "email", sortOrder: 80 },
  { key: "social_organic", label: "Organic Social", category: "social", sortOrder: 90 },
  { key: "qr", label: "QR Code", category: "offline", sortOrder: 100 },
  { key: "campaign_url", label: "Campaign URL", category: "campaign", sortOrder: 110 },
  { key: "other", label: "Other", category: "other", sortOrder: 120 },
] as const;

export async function ensureMarketingSources() {
  for (const source of DEFAULT_SOURCES) {
    await prisma.marketingSource.upsert({
      where: { key: source.key },
      create: source,
      update: { label: source.label, category: source.category, sortOrder: source.sortOrder },
    });
  }
}

export async function resolveSourceByKey(key: string) {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const existing = await prisma.marketingSource.findUnique({ where: { key: normalized } });
  if (existing) return existing;
  await ensureMarketingSources();
  return (
    (await prisma.marketingSource.findUnique({ where: { key: normalized } })) ??
    (await prisma.marketingSource.findUnique({ where: { key: "other" } }))
  );
}
