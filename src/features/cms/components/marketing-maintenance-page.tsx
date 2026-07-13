import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { BrandLogoImage } from "@/features/navigation/components/header/brand-logo-image";
import { getCompanyInfo } from "@/lib/data";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";

type Props = { locale: string };

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
    <main className="section-padding container-premium min-h-[50vh] py-16">
      <div className="mx-auto max-w-2xl text-center">
        {logoUrl ? (
          <div className="relative mx-auto mb-8 h-16 w-48 flex items-center justify-center">
            <BrandLogoImage src={logoUrl} width={192} height={64} priority />
          </div>
        ) : (
          <p className="font-heading mb-6 text-2xl font-semibold text-primary">{brandName}</p>
        )}

        <h1 className="font-heading text-3xl font-bold md:text-4xl">{t("title")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
        <p className="mt-2 text-muted-foreground">{t("body")}</p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" variant="gold">
            <Link href="/contact">{t("contactCta")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/contact">{t("inquireCta")}</Link>
          </Button>
        </div>
      </div>

      <Section className="mt-16">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t("reachUsLabel")}
          </p>
          <ul className="space-y-3">
            <li className="flex items-center justify-center gap-3">
              <Phone className="h-5 w-5 text-primary" aria-hidden />
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-primary">
                {phone}
              </a>
            </li>
            <li className="flex items-center justify-center gap-3">
              <Mail className="h-5 w-5 text-primary" aria-hidden />
              <a href={`mailto:${email}`} className="hover:text-primary">
                {email}
              </a>
            </li>
          </ul>
        </div>
      </Section>
    </main>
  );
}
