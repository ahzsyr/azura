import { pickLocaleField } from "@/features/builder/blocks/content/lib/locale-field";

const PORTAL_UI_LABELS = {
  searchTeamEn: "Search team...",
  searchTeamAr: "بحث...",
  searchPartnersEn: "Search partners...",
  searchPartnersAr: "بحث...",
  searchArticlesEn: "Search articles...",
  searchArticlesAr: "بحث...",
  allEn: "All",
  allAr: "الكل",
  websiteEn: "Website",
  websiteAr: "الموقع",
  partnerMapSoonEn: "Partner map view coming soon.",
  partnerMapSoonAr: "خريطة الشركاء قريباً.",
  noArticlesEn: "No articles found.",
  noArticlesAr: "لا توجد مقالات.",
  activeIncidentsEn: "Active incidents",
  activeIncidentsAr: "حوادث نشطة",
  scheduledMaintenanceEn: "Scheduled maintenance",
  scheduledMaintenanceAr: "صيانة مجدولة",
} as const;

export function portalSearchPlaceholder(
  kind: "team" | "partners" | "articles",
  locale: string
): string {
  const key =
    kind === "team" ? "searchTeam" : kind === "partners" ? "searchPartners" : "searchArticles";
  return pickLocaleField(PORTAL_UI_LABELS, key, locale);
}

export function portalAllLabel(locale: string): string {
  return pickLocaleField(PORTAL_UI_LABELS, "all", locale);
}

export function portalWebsiteLabel(locale: string): string {
  return pickLocaleField(PORTAL_UI_LABELS, "website", locale);
}

export function portalPartnerMapSoonLabel(locale: string): string {
  return pickLocaleField(PORTAL_UI_LABELS, "partnerMapSoon", locale);
}

export function portalNoArticlesLabel(locale: string): string {
  return pickLocaleField(PORTAL_UI_LABELS, "noArticles", locale);
}

export function portalActiveIncidentsLabel(locale: string): string {
  return pickLocaleField(PORTAL_UI_LABELS, "activeIncidents", locale);
}

export function portalScheduledMaintenanceLabel(locale: string): string {
  return pickLocaleField(PORTAL_UI_LABELS, "scheduledMaintenance", locale);
}
