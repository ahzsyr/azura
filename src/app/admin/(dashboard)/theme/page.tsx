import { themeRepository } from "@/repositories/theme.repository";
import { ThemeAdminClient } from "@/features/theme/components/theme-admin-client";
import { migrateBrandConfigFromHeaderIfNeeded } from "@/features/theme/theme-brand-migration";
import { ensureSiteThemeEffectColumns } from "@/features/theme/ensure-site-theme-effect-columns.server";
import { agentLog, serializeError } from "@/lib/debug/agent-log";

export default async function ThemeAdminPage() {
  // #region agent log
  agentLog("theme/page.tsx:entry", "ThemeAdminPage render start", {}, "H0");
  // #endregion

  try {
    try {
      await ensureSiteThemeEffectColumns();
      // #region agent log
      agentLog("theme/page.tsx:ensure", "ensureSiteThemeEffectColumns succeeded", {}, "H1");
      // #endregion
    } catch (error) {
      // #region agent log
      agentLog(
        "theme/page.tsx:ensure",
        "ensureSiteThemeEffectColumns failed",
        { error: serializeError(error) },
        "H1",
      );
      // #endregion
      throw error;
    }

    try {
      await migrateBrandConfigFromHeaderIfNeeded();
      // #region agent log
      agentLog(
        "theme/page.tsx:migrate",
        "migrateBrandConfigFromHeaderIfNeeded succeeded",
        {},
        "H2",
      );
      // #endregion
    } catch (error) {
      // #region agent log
      agentLog(
        "theme/page.tsx:migrate",
        "migrateBrandConfigFromHeaderIfNeeded failed",
        { error: serializeError(error) },
        "H2",
      );
      // #endregion
      throw error;
    }

    let draft;
    let published;
    try {
      [draft, published] = await Promise.all([
        themeRepository.getDraft(),
        themeRepository.getPublished(),
      ]);
      // #region agent log
      agentLog(
        "theme/page.tsx:fetch",
        "theme repository fetch succeeded",
        {
          hasDraft: Boolean(draft),
          hasPublished: Boolean(published),
          draftHasCursorSettings:
            draft != null && "cursorEffectSettings" in draft,
          publishedHasCursorSettings:
            published != null && "cursorEffectSettings" in published,
        },
        "H1",
      );
      // #endregion
    } catch (error) {
      // #region agent log
      agentLog(
        "theme/page.tsx:fetch",
        "theme repository fetch failed",
        { error: serializeError(error) },
        "H1",
      );
      // #endregion
      throw error;
    }

    // #region agent log
    agentLog(
      "theme/page.tsx:success",
      "ThemeAdminPage render succeeded",
      { hasDraft: Boolean(draft), hasPublished: Boolean(published) },
      "H0",
    );
    // #endregion

    return <ThemeAdminClient draft={draft} published={published} />;
  } catch (error) {
    // #region agent log
    agentLog(
      "theme/page.tsx:fatal",
      "ThemeAdminPage render failed",
      { error: serializeError(error) },
      "H0",
    );
    // #endregion
    throw error;
  }
}
