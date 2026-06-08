"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SiteTheme } from "@prisma/client";
import { saveThemeDraft, publishTheme } from "@/features/theme/actions";
import { AdminFormProvider } from "@/components/admin/layout/admin-form-provider";
import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { ThemeDirtySync } from "@/features/theme/components/theme-dirty-sync";
import { ThemeSaveNotifier } from "@/features/theme/components/theme-save-notifier";
import {
  ThemeStudioShell,
  readSavedThemeSection,
  THEME_SECTION_STORAGE_KEY,
  isThemeStudioSectionId,
  type ThemeStudioSectionId,
} from "./theme-studio-shell";
import { useThemeStudio } from "./use-theme-studio";
import { ThemePreviewPanel } from "./theme-preview-panel";
import {
  OverviewSection,
  PresetsSection,
  ColorsSection,
  TypographySection,
  LayoutSection,
  MotionSection,
  EffectsSection,
  CardsBordersSection,
  BackgroundsSection,
  AccessibilitySection,
  CustomCssSection,
  AdvancedSection,
  PreviewSection,
} from "./sections/theme-studio-sections";

type Props = {
  draft: SiteTheme | null;
  published: SiteTheme | null;
};

export function ThemeStudioForm({ draft, published }: Props) {
  const base = draft ?? published;
  if (!base) {
    return <p>No theme configured. Run database seed.</p>;
  }

  return <ThemeStudioFormContent draft={draft} published={published} base={base} />;
}

function ThemeStudioFormContent({
  draft,
  published,
  base,
}: Props & { base: SiteTheme }) {
  const searchParams = useSearchParams();
  const studio = useThemeStudio(base);
  const [section, setSection] = useState<ThemeStudioSectionId>("overview");
  const [previewLocale, setPreviewLocale] = useState<"en" | "ar">("en");
  const [previewAppearance, setPreviewAppearance] = useState<"light" | "dark">("light");
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl && isThemeStudioSectionId(fromUrl)) {
      setSection(fromUrl);
      return;
    }
    setSection(readSavedThemeSection());
  }, [searchParams]);

  const { resetFromBase } = studio;
  useEffect(() => {
    resetFromBase(base);
  }, [base.updatedAt, base.id, resetFromBase, base]);

  const changeSection = useCallback((next: ThemeStudioSectionId) => {
    setSection(next);
    try {
      localStorage.setItem(THEME_SECTION_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const hasUnpublishedDraft = Boolean(draft && published && draft.updatedAt > published.updatedAt);

  const onSave = useCallback(async () => {
    await saveThemeDraft(studio.buildFormData());
    studio.markSaved();
    document.cookie = "theme-preview=draft; path=/; max-age=3600";
  }, [studio]);

  const onPublish = useCallback(async () => {
    await saveThemeDraft(studio.buildFormData());
    await publishTheme();
    document.cookie = "theme-preview=; path=/; max-age=0";
    window.location.reload();
  }, [studio]);

  const onPreview = useCallback(() => {
    document.cookie = "theme-preview=draft; path=/; max-age=3600";
    window.open("/en", "_blank");
  }, []);

  const onCancel = useCallback(() => {
    studio.revertToSaved();
  }, [studio]);

  const sectionProps = {
    studio,
    resolved: studio.resolved,
    draft,
    published,
    onNavigate: (id: string) => {
      if (isThemeStudioSectionId(id)) changeSection(id);
    },
    previewLocale,
    onPreviewLocaleChange: setPreviewLocale,
    compareMode,
    onCompareModeChange: setCompareMode,
    previewAppearance,
    onPreviewAppearanceChange: setPreviewAppearance,
  };

  const renderSection = (tabId: ThemeStudioSectionId) => {
    switch (tabId) {
      case "overview":
        return <OverviewSection {...sectionProps} />;
      case "presets":
        return <PresetsSection studio={studio} />;
      case "colors":
        return <ColorsSection studio={studio} />;
      case "typography":
        return <TypographySection studio={studio} />;
      case "layout":
        return <LayoutSection studio={studio} />;
      case "motion":
        return <MotionSection studio={studio} />;
      case "effects":
        return <EffectsSection studio={studio} />;
      case "cards-borders":
        return <CardsBordersSection studio={studio} />;
      case "backgrounds":
        return <BackgroundsSection studio={studio} />;
      case "accessibility":
        return <AccessibilitySection studio={studio} />;
      case "custom-css":
        return <CustomCssSection studio={studio} />;
      case "advanced":
        return <AdvancedSection studio={studio} />;
      case "preview":
        return <PreviewSection {...sectionProps} />;
      default:
        return null;
    }
  };

  const stickyPreview =
    section !== "preview" ? (
      <ThemePreviewPanel
        tokens={studio.state}
        resolved={studio.resolved}
        savedTokens={JSON.parse(studio.savedSnapshot) as import("@/types/theme").ThemeTokens}
        previewLocale={previewLocale}
        onLocaleChange={setPreviewLocale}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        previewAppearance={previewAppearance}
        onPreviewAppearanceChange={setPreviewAppearance}
        compact
      />
    ) : null;

  return (
    <AdminFormProvider
      onSave={onSave}
      onPublish={onPublish}
      onPreview={onPreview}
      onCancel={onCancel}
      onUndo={studio.undo}
      onRedo={studio.redo}
      canUndo={studio.canUndo}
      canRedo={studio.canRedo}
    >
      <ThemeDirtySync state={studio.state} savedSnapshot={studio.savedSnapshot} />
      <ThemeSaveNotifier />
      <DesignHubShell
        title="Theme Studio"
        description="One place for presets, colors, typography, motion, effects, and live preview. Save draft, preview, then publish."
        preview={stickyPreview}
        previewDescription={
          studio.isDirty ? "Unsaved changes — preview reflects the editor." : "Matches saved draft."
        }
      >
        {hasUnpublishedDraft ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Draft has unpublished changes. Publish when ready.
          </p>
        ) : null}

        {studio.isDirty ? (
          <p className="text-xs text-muted-foreground">Unsaved changes in the editor.</p>
        ) : null}

        <ThemeStudioShell activeSection={section} onSectionChange={changeSection}>
          {renderSection}
        </ThemeStudioShell>
      </DesignHubShell>
    </AdminFormProvider>
  );
}
