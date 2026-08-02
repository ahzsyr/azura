import { setRequestLocale } from "next-intl/server";
import { isBuildWithoutDb } from "@/lib/build-db";
import { resolveHomePage } from "@/features/cms/resolve-home-page";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { renderCmsDegradationResponse } from "@/features/cms/components/cms-degradation-response";
import { HomeFallbackLanding } from "@/components/marketing/home/home-fallback-landing";
import { getErrorMessage, isRecoverableDbError } from "@/lib/debug/recoverable-db-error";

/** ISR: serve cached home HTML; regen at most every 60s (avoids force-dynamic 504 on Hostinger). */
export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (isBuildWithoutDb()) {
    return { title: "Home" };
  }

  try {
    return seoService.resolveMetadata({
      locale: locale as Locale,
      pageKey: "home",
    });
  } catch (error) {
    console.error("[marketing/home] metadata load failed:", error);
    return { title: "Home" };
  }
}

export default async function HomePage({ params }: Props) {
  try {
    const { locale } = await params;
    setRequestLocale(locale);

    if (isBuildWithoutDb()) {
      /** Empty shell at compile time — never bake demo landing template; ISR fills after deploy. */
      return <main className="min-h-[40vh]" aria-hidden="true" data-build-shell="true" />;
    }

    const resolution = await resolveHomePage();

    if (resolution.kind === "cms") {
      if (resolution.source === "stale") {
        console.warn("[marketing/home] serving stale cached home page");
      }
      return await MarketingCmsPage({
        slug: "home",
        locale: locale as Locale,
        page: resolution.page,
      });
    }

    console.warn("[marketing/home] serving static fallback landing");
    return await HomeFallbackLanding({ locale });
  } catch (error) {
    const message = getErrorMessage(error);
    const digest = (error as { digest?: string })?.digest ?? null;
    const errorName =
      (error as { name?: string })?.name ??
      (error as { constructor?: { name?: string } })?.constructor?.name ??
      "Error";
    console.error(`[marketing/home] render failed:`, {
      message,
      digest,
      errorName,
      recoverable: isRecoverableDbError(error),
    });

    if (isRecoverableDbError(error)) {
      const { locale } = await params;
      setRequestLocale(locale);
      return await renderCmsDegradationResponse("home", locale as Locale, { skipLive: true });
    }

    console.error("[marketing/home] non-recoverable error — serving fallback landing");
    const { locale } = await params;
    setRequestLocale(locale);
    return await renderCmsDegradationResponse("home", locale as Locale, {
      skipLive: true,
      terminal: true,
    });
  }
}
