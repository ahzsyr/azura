import { setRequestLocale } from "next-intl/server";
import { isBuildWithoutDb } from "@/lib/build-db";
import { resolveHomePage } from "@/features/cms/resolve-home-page";
import { seoService } from "@/features/seo/seo.service";
import type { Locale } from "@/i18n/routing";
import { MarketingCmsPage } from "@/features/cms/components/marketing-cms-page";
import { HomeFallbackLanding } from "@/components/marketing/home/home-fallback-landing";
import { logAgentDebug } from "@/lib/debug/agent-session-log.server";
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
    const message = getErrorMessage(error);
    // #region agent log
    logAgentDebug({
      location: "marketing/page.tsx:generateMetadata",
      message: "home metadata load failed",
      data: { errorMessage: message, recoverable: isRecoverableDbError(error) },
      hypothesisId: "B",
      runId: "post-fix",
    });
    // #endregion
    return { title: "Home" };
  }
}

export default async function HomePage({ params }: Props) {
  // #region agent log
  logAgentDebug({
    location: "marketing/page.tsx:HomePage:entry",
    message: "HomePage render start",
    hypothesisId: "G",
    runId: "post-fix",
  });
  // #endregion

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
      return (
        <MarketingCmsPage slug="home" locale={locale as Locale} page={resolution.page} />
      );
    }

    console.warn("[marketing/home] serving static fallback landing");
    return <HomeFallbackLanding locale={locale} />;
  } catch (error) {
    const message = getErrorMessage(error);
    // #region agent log
    logAgentDebug({
      location: "marketing/page.tsx:HomePage:outer-catch",
      message: "HomePage uncaught failure",
      data: { errorMessage: message, recoverable: isRecoverableDbError(error) },
      hypothesisId: "G",
      runId: "post-fix",
    });
    // #endregion
    console.error("[marketing/home] render failed:", message);
    if (isRecoverableDbError(error)) {
      const { locale } = await params;
      setRequestLocale(locale);
      const degraded = await resolveHomePage({ skipLive: true });
      if (degraded.kind === "cms") {
        return (
          <MarketingCmsPage slug="home" locale={locale as Locale} page={degraded.page} />
        );
      }
      return <HomeFallbackLanding locale={locale} />;
    }
    throw error;
  }
}
