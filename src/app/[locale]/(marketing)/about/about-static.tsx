import { getTranslations } from "next-intl/server";
import { Shield, Heart, Star, Users } from "lucide-react";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { TrustBadges } from "@/components/marketing/trust-badges";
import { getCompanyInfo } from "@/lib/data";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
import { getContentFieldSuffix } from "@/i18n/locale-config";
import {
  loadEntityTranslations,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";

export async function AboutStatic({ locale }: { locale: string }) {
  const [t, ctx, company, { brandName }] = await Promise.all([
    getTranslations({ locale, namespace: "about" }),
    loadPublicLocaleContext(locale),
    getCompanyInfo(),
    loadSiteBrandContext(),
  ]);
  const brand = { brandName };

  if (!company) {
    return <PageHero title={t("title", brand)} />;
  }

  const translations = await loadEntityTranslations("CompanyInfo", company.id);
  const fieldOpts = {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
    translations,
  };
  const valuesSuffix = getContentFieldSuffix(ctx.languageCode);
  const companyRecord = company as Record<string, unknown>;
  const values = (companyRecord[`values${valuesSuffix}`] ?? companyRecord.valuesEn) as string[];
  const badges = (company.trustBadges as string[]) ?? [];
  const valueIcons = [Shield, Heart, Star, Users];

  return (
    <>
      <JsonLd data={organizationJsonLd(company)} />
      <PageHero
        title={t("title", brand)}
        subtitle={getLocalizedField(company, "tagline", locale, fieldOpts)}
      />
      <Section>
        <SectionHeader title={t("story")} align="start" />
        <AnimatedSection>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {getLocalizedField(company, "story", locale, fieldOpts)}
          </p>
        </AnimatedSection>
      </Section>
      <Section variant="muted">
        <div className="grid gap-12 md:grid-cols-2">
          <AnimatedSection>
            <h2 className="font-heading text-2xl font-semibold">{t("mission")}</h2>
            <div className="gold-divider my-4" />
            <p className="leading-relaxed text-muted-foreground">
              {getLocalizedField(company, "mission", locale, fieldOpts)}
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <h2 className="font-heading text-2xl font-semibold">{t("vision")}</h2>
            <div className="gold-divider my-4" />
            <p className="leading-relaxed text-muted-foreground">
              {getLocalizedField(company, "vision", locale, fieldOpts)}
            </p>
          </AnimatedSection>
        </div>
      </Section>
      <Section>
        <SectionHeader title={t("values")} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {values.map((value, i) => {
            const Icon = valueIcons[i % valueIcons.length];
            return (
              <AnimatedSection key={value} delay={i * 0.08}>
                <div className="rounded-xl border p-6">
                  <Icon className="mb-3 h-8 w-8 text-primary" />
                  <p className="font-medium">{value}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </Section>
      <Section variant="muted">
        <SectionHeader title={t("legal")} />
        <div className="rounded-xl border bg-card p-8">
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t("registrationNumber")}</dt>
              <dd className="mt-1 font-semibold">{company.registrationNo}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">{t("licenseInformation")}</dt>
              <dd className="mt-1">{company.licenseInfo}</dd>
            </div>
          </dl>
        </div>
      </Section>
      <Section>
        <SectionHeader title={t("trustBadges")} />
        <TrustBadges />
        {badges.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
