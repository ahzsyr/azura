import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { IMAGE_SIZES } from "@/lib/config/performance";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";
import { HeroAtmosphere } from "@/components/marketing/hero-atmosphere";

type Props = { locale: string };

export async function HomeHero({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "hero" });

  return (
    <section
      className="relative flex min-h-[85vh] items-center overflow-hidden"
      data-block-type="hero"
    >
      <OptimizedImage
        src={DEFAULT_MEDIA_PLACEHOLDER}
        alt="Kaaba"
        fill
        aboveFold
        className="object-cover -z-10"
        sizes={IMAGE_SIZES.hero}
      />
      <HeroAtmosphere />
      <div className="hero-overlay absolute inset-0 -z-[1]" aria-hidden />
      <div className="container-premium relative z-10 py-20 text-white animate-fade-in">
        <span className="az-hero-badge mb-6 text-xs font-medium uppercase tracking-wider text-accent">
          {t("badge")}
        </span>
        <h1
          className="font-heading max-w-3xl text-4xl font-bold leading-tight md:text-5xl lg:text-6xl"
          data-hero-title
          data-text-effect-target="heading"
        >
          {t("title")}
        </h1>
        <div className="gold-divider my-6" />
        <p className="max-w-xl text-lg text-white/85">{t("subtitle")}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Button asChild size="lg" variant="gold">
            <Link href="/packages">
              {t("ctaPrimary")}
              <ArrowRight className="h-4 w-4 rtl-flip" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/contact">{t("ctaSecondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
