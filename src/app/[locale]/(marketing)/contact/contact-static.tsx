import { getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { getWhatsappDefaultMessage } from "@/config/site";
import { getCompanyInfo } from "@/lib/data";
import { resolveSiteIdentity } from "@/lib/site-identity";
import { getLocalizedField, getWhatsAppUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = { locale: string };

export async function ContactStatic({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "contact" });
  const company = await getCompanyInfo();
  const { brandName } = resolveSiteIdentity({ companyName: company?.name });

  const mapsUrl =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ??
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3624.7!2d39.8262!3d21.4225!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDI1JzIxLjAiTiAzOcKwNDknMzQuMyJF!5e0!3m2!1sen!2ssa!4v1234567890";

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader title={t("form")} align="start" />
            <InquiryForm locale={locale} type="CONTACT" />
          </div>

          <div className="space-y-8">
            <SectionHeader title={t("office")} align="start" />
            {company && (
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-primary" />
                  <span>{getLocalizedField(company, "address", locale)}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <a href={`tel:${company.phone}`} className="hover:text-primary">
                    {company.phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <a href={`mailto:${company.email}`} className="hover:text-primary">
                    {company.email}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{getLocalizedField(company, "officeHours", locale)}</span>
                </li>
              </ul>
            )}
            <Button asChild variant="gold" className="w-full sm:w-auto">
              <a
                href={getWhatsAppUrl(
                  company?.whatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
                  getWhatsappDefaultMessage(brandName)
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("whatsapp")}
              </a>
            </Button>
          </div>
        </div>
      </Section>

      <Section variant="muted">
        <div className="aspect-[21/9] overflow-hidden rounded-2xl">
          <iframe
            src={mapsUrl}
            title="Office location"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Section>
    </>
  );
}
