import { getTranslations } from "next-intl/server";
import { FileText, Globe } from "lucide-react";
import { PageHero, Section, SectionHeader } from "@/components/marketing/section";
import { FAQAccordion, VisaTimeline } from "@/components/marketing/faq-accordion";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { getFaqSetBySlug } from "@/lib/data";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { getLocalizedField } from "@/lib/utils";

type Props = { locale: string };

const visaCategories = [
  {
    titleEn: "Umrah Visa",
    titleAr: "تأشيرة العمرة",
    descEn: "Complete Umrah visa processing with expert guidance and document verification.",
    descAr: "معالجة تأشيرة العمرة الكاملة مع إرشاد متخصص والتحقق من المستندات.",
  },
  {
    titleEn: "Group Visa",
    titleAr: "تأشيرة جماعية",
    descEn: "Streamlined group visa services for families and organized pilgrim groups.",
    descAr: "خدمات تأشيرة جماعية مبسطة للعائلات ومجموعات الحجاج المنظمة.",
  },
  {
    titleEn: "Express Processing",
    titleAr: "معالجة سريعة",
    descEn: "Priority visa processing for urgent travel requirements.",
    descAr: "معالجة تأشيرة ذات أولوية لمتطلبات السفر العاجلة.",
  },
];

const timelineSteps = [
  {
    titleEn: "Submit Documents",
    titleAr: "تقديم المستندات",
    descEn: "Provide passport, photos, and required application forms.",
    descAr: "تقديم جواز السفر والصور ونماذج الطلب المطلوبة.",
  },
  {
    titleEn: "Document Review",
    titleAr: "مراجعة المستندات",
    descEn: "Our team verifies all documents for compliance.",
    descAr: "يقوم فريقنا بالتحقق من جميع المستندات للامتثال.",
  },
  {
    titleEn: "Visa Submission",
    titleAr: "تقديم التأشيرة",
    descEn: "Application submitted to relevant authorities.",
    descAr: "تقديم الطلب إلى الجهات المختصة.",
  },
  {
    titleEn: "Visa Approval",
    titleAr: "موافقة التأشيرة",
    descEn: "Receive your approved visa and travel confirmation.",
    descAr: "استلام التأشيرة المعتمدة وتأكيد السفر.",
  },
];

const requirements = [
  { textEn: "Valid passport (minimum 6 months validity)", textAr: "جواز سفر ساري (صلاحية 6 أشهر على الأقل)" },
  { textEn: "Recent passport-size photographs", textAr: "صور بحجم جواز السفر حديثة" },
  { textEn: "Completed visa application form", textAr: "نموذج طلب التأشيرة مكتمل" },
  { textEn: "Proof of vaccination (if required)", textAr: "إثبات التطعيم (إذا لزم الأمر)" },
  { textEn: "Travel itinerary confirmation", textAr: "تأكيد برنامج السفر" },
];

export async function VisaStatic({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "visa" });
  const faqSet = await getFaqSetBySlug("visa");
  const faqs = faqSet?.items ?? [];

  return (
    <>
      {faqs.length > 0 && (
        <JsonLd
          data={faqJsonLd(
            faqs.map((f) => ({
              question: getLocalizedField(f, "question", locale),
              answer: getLocalizedField(f, "answer", locale),
            }))
          )}
        />
      )}

      <PageHero title={t("title")} subtitle={t("subtitle")} />

      <Section>
        <SectionHeader title={t("categories")} />
        <div className="grid gap-6 md:grid-cols-3">
          {visaCategories.map((cat) => (
            <div key={cat.titleEn} className="rounded-xl border p-6">
              <Globe className="mb-4 h-8 w-8 text-primary" />
              <h3 className="font-heading text-lg font-semibold">
                {getLocalizedField(cat, "title", locale)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {getLocalizedField(cat, "desc", locale)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader title={t("timeline")} />
        <VisaTimeline steps={timelineSteps} locale={locale} />
      </Section>

      <Section>
        <SectionHeader title={t("requirements")} />
        <ul className="mx-auto max-w-2xl space-y-3">
          {requirements.map((req) => (
            <li key={req.textEn} className="flex items-start gap-3 rounded-lg border p-4">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>{getLocalizedField(req, "text", locale)}</span>
            </li>
          ))}
        </ul>
      </Section>

      {faqs.length > 0 && (
        <Section variant="muted">
          <SectionHeader title={t("faq")} />
          <div className="mx-auto max-w-3xl">
            <FAQAccordion faqs={faqs} locale={locale} />
          </div>
        </Section>
      )}

      <Section>
        <SectionHeader title={t("inquire")} />
        <div className="mx-auto max-w-xl">
          <InquiryForm locale={locale} type="VISA" />
        </div>
      </Section>
    </>
  );
}
