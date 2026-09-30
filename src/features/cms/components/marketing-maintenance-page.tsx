import { getTranslations } from "next-intl/server";
import { BrandedStatusPage } from "@/features/cms/components/branded-status-page";
import { getCompanyInfo } from "@/lib/data";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";

type Props = { locale: string };

/** Loads brand + maintenance i18n and renders the shared status chrome. */
export async function MarketingMaintenancePage({ locale }: Props) {
  const [t, company, themeResult] = await Promise.all([
    getTranslations({ locale, namespace: "maintenance" }),
    getCompanyInfo().catch(() => null),
    resolvePublishedSiteTheme().catch(() => null),
  ]);

  const identity = getDefaultSiteIdentity();
  const brandName = company?.name?.trim() || identity.brandName;
  const phone = company?.phone?.trim() || t("contactPhone");
  const email = company?.email?.trim() || t("contactEmail");
  const brandConfig = themeResult?.tokens?.brandConfig;
  const logoUrl =
    themeResult?.tokens?.logoUrl?.trim() ||
    brandConfig?.logoImageLightUrl?.trim() ||
    brandConfig?.logoImageUrl?.trim() ||
    brandConfig?.logoImageDarkUrl?.trim() ||
    null;

  return (
    <BrandedStatusPage
      brandName={brandName}
      logoUrl={logoUrl}
      title={t("title")}
      subtitle={t("subtitle")}
      body={t("body")}
      contactCta={t("contactCta")}
      inquireCta={t("inquireCta")}
      reachUsLabel={t("reachUsLabel")}
      phone={phone}
      email={email}
    />
  );
}
