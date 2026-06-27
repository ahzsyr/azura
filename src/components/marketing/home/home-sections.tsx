import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/marketing/section";
import { AnimatedSection } from "@/components/motion/lazy-motion";
import { TrustBadges, TrustStatement } from "@/components/marketing/trust-badges";
import { PackageCard } from "@/components/packages/package-card";
import { ServiceCard, FeatureGrid, CTABanner } from "@/components/marketing/service-card";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { GalleryMediaPreviewGrid } from "@/components/marketing/gallery-media-preview-grid";
import { getMarketingHomeBatch } from "@/lib/data";
import { loadSiteBrandContext } from "@/lib/load-site-brand-context";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
import { contentPublicService } from "@/features/content/content-public.service";
import { loadComparePropsFromContentTypeView } from "@/features/comparison/load-compare-props";

type Props = { locale: string };

export async function HomeSections({ locale }: Props) {
  await contentPublicService.ensureReady();
  const [t, { brandName }, { company, packages, services, testimonials, gallery }, catalogType, offeringsType] =
    await Promise.all([
      getTranslations({ locale }),
      loadSiteBrandContext(),
      getMarketingHomeBatch(),
      contentPublicService.getTypeBySlug("catalog-items"),
      contentPublicService.getTypeBySlug("offerings"),
    ]);

  const packageCompare = catalogType
    ? loadComparePropsFromContentTypeView(catalogType, locale)
    : undefined;
  const offeringCompare = offeringsType
    ? loadComparePropsFromContentTypeView(offeringsType, locale)
    : undefined;

  const brand = { brandName };

  const whyUsItems = [
    t("whyUs.items.trust.title"),
    t("whyUs.items.care.title"),
    t("whyUs.items.premium.title"),
    t("whyUs.items.support.title"),
  ].map((title, i) => ({
    title,
    desc: [
      t("whyUs.items.trust.desc"),
      t("whyUs.items.care.desc"),
      t("whyUs.items.premium.desc"),
      t("whyUs.items.support.desc"),
    ][i],
  }));

  return (
    <>
      {company && <JsonLd data={organizationJsonLd(company)} />}

      <Section>
        <TrustStatement registrationNo={company?.registrationNo} locale={locale} />
        <div className="mt-12">
          <TrustBadges />
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader title={t("packages.title")} subtitle={t("packages.subtitle")} />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, i) => (
            <AnimatedSection key={pkg.id} delay={i * 0.1}>
              <PackageCard pkg={pkg} locale={locale} compare={packageCompare} />
            </AnimatedSection>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/packages">{t("packages.viewAll")}</Link>
          </Button>
        </div>
      </Section>

      <Section>
        <SectionHeader title={t("whyUs.title", brand)} subtitle={t("whyUs.subtitle")} />
        <AnimatedSection>
          <FeatureGrid items={whyUsItems} />
        </AnimatedSection>
      </Section>

      <Section variant="muted">
        <SectionHeader title={t("services.title")} subtitle={t("services.subtitle")} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((service, i) => (
            <AnimatedSection key={service.id} delay={i * 0.08}>
              <ServiceCard service={service} locale={locale} compare={offeringCompare} />
            </AnimatedSection>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader title={t("testimonials.title")} subtitle={t("testimonials.subtitle")} />
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <TestimonialCard key={item.id} testimonial={item} locale={locale} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="outline">
            <Link href="/testimonials">{t("testimonials.viewAll")}</Link>
          </Button>
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader
          title={t("gallery.title")}
          subtitle={t("gallery.subtitle", brand)}
        />
        <GalleryMediaPreviewGrid items={gallery} locale={locale} />
        <div className="mt-10 text-center">
          <Button asChild variant="outline">
            <Link href="/gallery">{t("gallery.viewAll")}</Link>
          </Button>
        </div>
      </Section>

      <Section>
        <CTABanner
          title={t("cta.title")}
          subtitle={t("cta.subtitle")}
          buttonLabel={t("cta.button")}
          href="/contact"
        />
      </Section>
    </>
  );
}
