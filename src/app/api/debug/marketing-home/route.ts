import { NextResponse } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { loadCachedHomePage } from "@/features/cms/load-home-page";
import { processDueScheduled } from "@/features/cms/scheduling";
import { loadPublicLocaleContext } from "@/features/i18n/public-locale-context";
import { seoService } from "@/features/seo/seo.service";
import { translationService } from "@/features/translation/translation.service";
import { getLocalizedField } from "@/lib/utils";
import { isBuildWithoutDb } from "@/lib/build-db";
import { cmsRepository } from "@/repositories/cms.repository";
import { pageCache } from "@/features/storage/page-cache";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Step = {
  step: string;
  ok: boolean;
  ms?: number;
  detail?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    digest?: string;
  };
};

const STEP_TIMEOUT_MS = 6_000;
function describeError(error: unknown): Step["error"] {
  return {
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    digest:
      error instanceof Error && "digest" in error
        ? String((error as Error & { digest?: unknown }).digest)
        : undefined,
  };
}

async function runTimedStep<T>(
  steps: Step[],
  step: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const startedAt = Date.now();
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const result = await Promise.race([
      Promise.resolve().then(fn),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Timed out after ${STEP_TIMEOUT_MS}ms`)),
          STEP_TIMEOUT_MS,
        );
      }),
    ]);
    if (timeout) clearTimeout(timeout);
    steps.push({ step, ok: true, ms: Date.now() - startedAt });
    return result;
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    steps.push({ step, ok: false, ms: Date.now() - startedAt, error: describeError(error) });
    throw error;
  }
}

function describePage(page: Awaited<ReturnType<typeof cmsRepository.getPageBySlug>> | null) {
  return {
    found: Boolean(page),
    id: page?.id,
    slug: page?.slug,
    status: page?.status,
    templateKey: page?.templateKey,
    blockCount: Array.isArray(page?.blocks) ? page.blocks.length : null,
    hasSeoMeta: Boolean(page?.seoMeta),
    updatedAt: page?.updatedAt?.toISOString(),
  };
}

function describeBlock(block: unknown, index: number) {
  const record = block && typeof block === "object" ? (block as Record<string, unknown>) : {};
  const props = record.props && typeof record.props === "object"
    ? (record.props as Record<string, unknown>)
    : {};
  return {
    index,
    id: typeof record.id === "string" ? record.id : null,
    type: typeof record.type === "string" ? record.type : null,
    childCount: Array.isArray(record.children) ? record.children.length : 0,
    propKeys: Object.keys(props).slice(0, 20),
  };
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const mode = url.searchParams.get("mode")?.trim() || "full";
  const steps: Step[] = [];

  try {
    const buildWithoutDb = isBuildWithoutDb();
    steps.push({ step: "isBuildWithoutDb", ok: true, detail: { buildWithoutDb } });
    if (buildWithoutDb) {
      return NextResponse.json({
        result: "ok",
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    }

    if (mode === "scheduled") {
      const scheduled = await runTimedStep(steps, "processDueScheduled", () =>
        processDueScheduled(),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: scheduled,
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    }

    if (mode === "repository") {
      const page = await runTimedStep(steps, "cmsRepository.getPageBySlug", () =>
        cmsRepository.getPageBySlug("home", true),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: describePage(page),
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    }

    if (mode === "page-cache") {
      const cached = await runTimedStep(steps, "pageCache.get", () => pageCache.get("home"));
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: {
          found: Boolean(cached),
          id: cached?.id,
          slug: cached?.slug,
          blockCount: Array.isArray(cached?.blocks) ? cached.blocks.length : null,
          updatedAt: cached?.updatedAt,
        },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    }

    if (mode === "repository-translations") {
      const page = await runTimedStep(steps, "cmsRepository.getPageBySlug", () =>
        cmsRepository.getPageBySlug("home", true),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: describePage(page),
      };
      if (!page) {
        return NextResponse.json(
          { result: "not_found", mode, locale, elapsedMs: Date.now() - startedAt, steps },
          { status: 404 },
        );
      }
      const translations = await runTimedStep(steps, "translationService.getForEntity", () =>
        translationService.getForEntity("CmsPage", page.id),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: { count: translations.length },
      };
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    }

    if (mode === "deep") {
      const scheduled = await runTimedStep(steps, "processDueScheduled", () =>
        processDueScheduled(),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: scheduled,
      };
      const page = await runTimedStep(steps, "cmsRepository.getPageBySlug", () =>
        cmsRepository.getPageBySlug("home", true),
      );
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: describePage(page),
      };
      const cached = await runTimedStep(steps, "pageCache.get", () => pageCache.get("home"));
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: { found: Boolean(cached), updatedAt: cached?.updatedAt },
      };
      if (page) {
        const translations = await runTimedStep(steps, "translationService.getForEntity", () =>
          translationService.getForEntity("CmsPage", page.id),
        );
        steps[steps.length - 1] = {
          ...steps[steps.length - 1],
          detail: { count: translations.length },
        };
      }
      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    }

    if (mode === "block-list") {
      await runTimedStep(steps, "setRequestLocale", () => {
        setRequestLocale(locale);
        return true;
      });
      const page = await runTimedStep(steps, "loadCachedHomePage", () => loadCachedHomePage());
      steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        detail: {
          found: Boolean(page),
          id: page?.id,
          slug: page?.slug,
          blockCount: Array.isArray(page?.blocks) ? page.blocks.length : null,
        },
      };
      if (!page) {
        return NextResponse.json(
          { result: "not_found", mode, locale, elapsedMs: Date.now() - startedAt, steps },
          { status: 404 },
        );
      }

      const blocks = Array.isArray(page.blocks) ? page.blocks : [];
      steps.push({
        step: "describeHomeBlocks",
        ok: true,
        detail: {
          count: blocks.length,
          blocks: blocks.map((block, index) => describeBlock(block, index)),
        },
      });

      return NextResponse.json({
        result: "ok",
        mode,
        locale,
        elapsedMs: Date.now() - startedAt,
        steps,
      });
    }

    await runTimedStep(steps, "setRequestLocale", () => {
      setRequestLocale(locale);
      return true;
    });

    const page = await runTimedStep(steps, "loadCachedHomePage", () => loadCachedHomePage());
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      detail: {
        found: Boolean(page),
        id: page?.id,
        slug: page?.slug,
        status: page?.status,
        templateKey: page?.templateKey,
        blockCount: Array.isArray(page?.blocks) ? page.blocks.length : null,
        hasSeoMeta: Boolean(page?.seoMeta),
      },
    };

    if (!page) {
      return NextResponse.json(
        { result: "not_found", locale, elapsedMs: Date.now() - startedAt, steps },
        { status: 404 },
      );
    }

    const localeCtx = await runTimedStep(steps, "loadPublicLocaleContext", () =>
      loadPublicLocaleContext(locale),
    );
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      detail: {
        urlPrefix: localeCtx.urlPrefix,
        languageCode: localeCtx.languageCode,
        defaultCode: localeCtx.defaultCode,
        enabledLocalesCount: localeCtx.enabledLocales.length,
      },
    };

    const translations = await runTimedStep(steps, "translationService.getForEntity", () =>
      translationService.getForEntity("CmsPage", page.id),
    );
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      detail: { count: translations.length },
    };

    const fallback = await runTimedStep(steps, "resolveFallbackFields", () => ({
      title:
        getLocalizedField(page, "title", locale, {
          enabledLocales: localeCtx.enabledLocales,
          defaultCode: localeCtx.defaultCode,
          translations,
        }) || "Home",
      description: getLocalizedField(page, "excerpt", locale, {
        enabledLocales: localeCtx.enabledLocales,
        defaultCode: localeCtx.defaultCode,
        translations,
      }),
    }));
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      detail: {
        titleLength: fallback.title.length,
        descriptionLength: fallback.description.length,
      },
    };

    const metadata = await runTimedStep(steps, "seoService.resolveMetadata", () =>
      seoService.resolveMetadata({
        locale: locale as Locale,
        path: "",
        entityType: "CMS_PAGE",
        entityId: page.id,
        seoMeta: page.seoMeta,
        fallback,
      }),
    );
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      detail: {
        titleType: typeof metadata.title,
        hasDescription: Boolean(metadata.description),
      },
    };

    return NextResponse.json({
      result: "ok",
      locale,
      elapsedMs: Date.now() - startedAt,
      steps,
    });
  } catch {
    return NextResponse.json(
      { result: "error", locale, elapsedMs: Date.now() - startedAt, steps },
      { status: 500 },
    );
  }
}
