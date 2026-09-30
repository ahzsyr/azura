import { setRequestLocale } from "next-intl/server";
import { isCompileTimeBuildWithoutDb } from "@/lib/build-db";
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
  if (isCompileTimeBuildWithoutDb()) {
    return {
      title: {
        absolute: "BRT Trading | Enterprise Wireless Networks & Hardware Dubai",
      },
      description:
        "BRT Trading LLC provides wireless, networking and smart technology solutions for businesses and organizations in Dubai, UAE.",
    };
  }

  const homeFallback = {
    title: "BRT Trading | Enterprise Wireless Networks & Hardware Dubai",
    description:
      "BRT Trading LLC provides wireless, networking, security, IoT and smart technology solutions in Dubai, UAE.",
  };

  try {
    return seoService.resolveMetadata({
      locale: locale as Locale,
      pageKey: "home",
      path: "/",
      fallback: homeFallback,
    });
  } catch (error) {
    console.error("[marketing/home] metadata load failed:", error);
    return seoService.resolveMetadata({
      locale: locale as Locale,
      pageKey: "home",
      path: "/",
      fallback: homeFallback,
    });
  }
}

export default async function HomePage({ params }: Props) {
  try {
    const { locale } = await params;
    setRequestLocale(locale);

    /**
     * Empty shell is compile-time only — never bake demo landing into the build.
     * At runtime (even if BUILD_WITHOUT_DB leaks), resolve real content / fallbacks.
     * Do not call revalidatePath() here — that would add load on every recovery hit.
     */
    if (isCompileTimeBuildWithoutDb()) {
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
