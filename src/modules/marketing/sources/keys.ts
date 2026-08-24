/**
 * Pure helpers for MarketingSource key mapping (safe for unit tests).
 */

export function mapUtmSourceToKey(utmSource?: string | null, clickIdType?: string | null): string {
  if (clickIdType === "GCLID") return "google_ads";
  if (clickIdType === "FBCLID") return "meta_ads";
  if (clickIdType === "LI_FAT_ID") return "linkedin_ads";
  if (clickIdType === "MSCLKID") return "other";

  const s = (utmSource ?? "").toLowerCase();
  if (!s) return "direct";
  if (s.includes("facebook") || s === "fb" || s === "meta") return "meta_ads";
  if (s.includes("instagram") || s === "ig") return "instagram_ads";
  if (s.includes("google")) return "google_ads";
  if (s.includes("linkedin")) return "linkedin_ads";
  if (s.includes("email") || s.includes("newsletter")) return "email";
  if (s.includes("qr")) return "qr";
  return "other";
}

export function classifyTrafficType(sourceCategory?: string | null, medium?: string | null): string {
  const m = (medium ?? "").toLowerCase();
  if (m.includes("cpc") || m.includes("paid") || m.includes("ppc") || sourceCategory === "paid") {
    return "paid";
  }
  if (sourceCategory === "organic" || m === "organic") return "organic";
  if (sourceCategory === "direct" || !medium) return "direct";
  if (sourceCategory === "referral" || m === "referral") return "referral";
  return "other";
}
