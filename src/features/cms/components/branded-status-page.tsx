import { Link } from "@/i18n/navigation";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { BrandLogoImage } from "@/features/navigation/components/header/brand-logo-image";

export type BrandedStatusPageProps = {
  brandName: string;
  logoUrl?: string | null;
  title: string;
  subtitle: string;
  body: string;
  contactCta: string;
  inquireCta: string;
  reachUsLabel: string;
  phone: string;
  email: string;
  contactHref?: string;
};

/** Shared marketing status chrome (maintenance / 404). */
export function BrandedStatusPage({
  brandName,
  logoUrl,
  title,
  subtitle,
  body,
  contactCta,
  inquireCta,
  reachUsLabel,
  phone,
  email,
  contactHref = "/contact",
}: BrandedStatusPageProps) {
  return (
    <main className="section-padding container-premium min-h-[50vh] py-16">
      <div className="mx-auto max-w-2xl text-center">
        {logoUrl ? (
          <div className="relative mx-auto mb-8 flex h-16 w-48 items-center justify-center">
            <BrandLogoImage src={logoUrl} width={192} height={64} priority />
          </div>
        ) : (
          <p className="font-heading mb-6 text-2xl font-semibold text-primary">{brandName}</p>
        )}

        <h1 className="font-heading text-3xl font-bold md:text-4xl">{title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
        <p className="mt-2 text-muted-foreground">{body}</p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" variant="gold">
            <Link href={contactHref}>{contactCta}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={contactHref}>{inquireCta}</Link>
          </Button>
        </div>
      </div>

      <Section className="mt-16">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {reachUsLabel}
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
