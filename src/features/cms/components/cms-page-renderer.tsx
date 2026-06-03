import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import type { CmsPage, EntityTranslation } from "@prisma/client";
import { cmsService } from "@/features/cms/cms.service";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import {
  isPageHeaderOverlayActive,
  resolvePageHeaderOverlay,
} from "@/features/builder/header-overlay";
import { navigationService } from "@/features/navigation/navigation.service";
import { themeService } from "@/features/theme/theme.service";
import type { PageBlocks } from "@/types/builder";
import { getLocalizedField } from "@/lib/utils";
import type { TranslationBundle } from "@/features/translation/translation-bundle";
import { getBundleTranslations } from "@/features/translation/translation-bundle";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { parsePageVisualSettings } from "@/schemas/visual-settings";
import { resolveVisualExperience } from "@/features/theme/visual-experience-resolver";
import { VisualExperienceProvider } from "@/components/theme/visual-experience-provider";
import { PageVisualEffects } from "@/components/theme/theme-effects-client";

type Props = {
  slug: string;
  locale: Locale;
  page?: CmsPage | null;
  translationBundle?: TranslationBundle;
  pageTranslations?: EntityTranslation[];
};

export async function CmsPageRenderer({
  slug,
  locale,
  page: pageProp,
  translationBundle,
  pageTranslations: pageTranslationsProp,
}: Props) {
  const page = pageProp ?? (await cmsService.getPublishedPageBySlug(slug));
  if (!page) notFound();

  const [theme, headerWorkspace] = await Promise.all([
    themeService.getPublished(),
    navigationService.getWorkspaceForSite(undefined, locale),
  ]);
  const blocks = (page.blocks as PageBlocks) ?? [];
  const enabledLocales =
    translationBundle?.enabledLocales ?? (await localeService.listEnabled());
  const pageTranslationsResolved = pageTranslationsProp !== undefined
    ? pageTranslationsProp
    : translationBundle
      ? getBundleTranslations(translationBundle, "CmsPage", page.id)
      : await translationService.getForEntity("CmsPage", page.id);
  const pageTranslations = pageTranslationsResolved;
  const pageHeaderOverlay = resolvePageHeaderOverlay(headerWorkspace.settings, blocks);
  const overlayActive = isPageHeaderOverlayActive(headerWorkspace.settings, blocks);
  const pageVisual = parsePageVisualSettings(
    "visualSettings" in page ? (page as CmsPage & { visualSettings?: unknown }).visualSettings : {},
  );
  const resolved =
    theme != null ? resolveVisualExperience({ site: theme, page: pageVisual }) : null;

  return (
    <VisualExperienceProvider site={theme} page={pageVisual}>
      {theme ? <PageVisualEffects site={theme} page={pageVisual} /> : null}
      <article
      {...(overlayActive
        ? {
            "data-page-header-overlay": "true",
            "data-page-header-overlay-surface": pageHeaderOverlay?.surface ?? "glass",
          }
        : {})}
    >
      {blocks.length > 0 ? (
        <BlockRenderer
          blocks={blocks}
          locale={locale}
          lazyLoad={theme?.lazyLoadEnabled ?? true}
          parentType="CmsPage"
          parentId={page.id}
          translationBundle={translationBundle}
          pageHeaderOverlay={pageHeaderOverlay}
          theme={theme}
          siteTextEffect={resolved?.textEffect ?? null}
          pageAnimationsEnabled={resolved?.animationsEnabled}
        />
      ) : (
        <div className="section-padding container-premium">
          <h1 className="font-heading text-4xl font-bold">
            {getLocalizedField(page, "title", locale, {
              enabledLocales,
              translations: pageTranslations,
            })}
          </h1>
          {getLocalizedField(page, "excerpt", locale, {
            enabledLocales,
            translations: pageTranslations,
          }) && (
            <p className="mt-4 text-lg text-muted-foreground">
              {getLocalizedField(page, "excerpt", locale, {
                enabledLocales,
                translations: pageTranslations,
              })}
            </p>
          )}
        </div>
      )}
    </article>
    </VisualExperienceProvider>
  );
}
