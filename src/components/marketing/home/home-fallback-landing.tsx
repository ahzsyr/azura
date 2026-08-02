import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Mail, Phone, Radio, Wifi } from "lucide-react";
import { HomeHero } from "@/components/marketing/home/home-hero";
import { Section, SectionHeader } from "@/components/marketing/section";
import { CTABanner } from "@/components/marketing/service-card";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanyInfo } from "@/lib/data";
import { getDefaultSiteIdentity } from "@/lib/site-identity";

type Props = { locale: string };

const HIGHLIGHTS = [
  { key: "products" as const, href: "/products" as const, icon: Radio },
  { key: "collections" as const, href: "/collections" as const, icon: Wifi },
  { key: "contact" as const, href: "/contact" as const, icon: Mail },
];

export async function HomeFallbackLanding({ locale }: Props) {
  try {
    const [t, company] = await Promise.all([
      getTranslations({ locale, namespace: "homeFallback" }),
      getCompanyInfo().catch(() => null),
    ]);
    const identity = getDefaultSiteIdentity();
    const brandName = company?.name?.trim() || identity.brandName;
    const phone = company?.phone?.trim() || t("contactPhone");
    const email = company?.email?.trim() || t("contactEmail");

    return (
      <>
        <HomeHero locale={locale} />

        <Section>
          <SectionHeader title={t("welcomeTitle", { brandName })} subtitle={t("welcomeBody")} />
          <div className="grid gap-6 md:grid-cols-3">
            {HIGHLIGHTS.map(({ key, href, icon: Icon }) => (
              <Card key={key} className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <Icon className="mb-2 h-8 w-8 text-primary" aria-hidden />
                  <CardTitle className="font-heading text-lg">{t(`highlights.${key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t(`highlights.${key}.desc`)}
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={href}>
                      {t(`highlights.${key}.cta`)}
                      <ArrowRight className="h-4 w-4 rtl-flip" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section variant="muted">
          <CTABanner
            title={t("ctaTitle", { brandName })}
            subtitle={t("ctaSubtitle")}
            buttonLabel={t("ctaContact")}
            href="/contact"
          />
        </Section>

        <Section>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <SectionHeader
                title={t("inquiryTitle")}
                subtitle={t("inquirySubtitle")}
                align="start"
              />
              <div className="az-form-surface rounded-xl border border-border/60 bg-card/95 p-6 shadow-sm">
                <InquiryForm locale={locale} type="GENERAL" />
              </div>
            </div>
            <div className="space-y-6">
              <SectionHeader title={t("reachUsTitle")} align="start" />
              <ul className="space-y-4 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-primary">
                    {phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <a href={`mailto:${email}`} className="hover:text-primary">
                    {email}
                  </a>
                </li>
              </ul>
              <Button asChild size="lg" variant="gold">
                <Link href="/contact">{t("ctaContact")}</Link>
              </Button>
            </div>
          </div>
        </Section>
      </>
    );
  } catch (error) {
    console.error("[HomeFallbackLanding] render failed:", {
      locale,
      digest: (error as { digest?: string })?.digest ?? null,
      errorName:
        (error as { name?: string })?.name ??
        (error as { constructor?: { name?: string } })?.constructor?.name ??
        "Error",
    });
    return (
      <main className="section-padding container-premium min-h-[40vh] py-16 text-center">
        <h1 className="font-heading text-3xl font-bold">Welcome</h1>
        <p className="mt-4 text-muted-foreground">
          This page is temporarily unavailable. Please try again shortly.
        </p>
      </main>
    );
  }
}
