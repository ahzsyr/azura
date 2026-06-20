"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EntityTranslation, SiteTheme } from "@prisma/client";
import { saveThemeDraftPatch, publishTheme } from "@/features/theme/actions";
import { computePatch, isEmptyPatch } from "@/lib/patch";
import { AdminFormProvider, useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { ThemeDirtySync } from "@/features/theme/components/theme-dirty-sync";
import { ThemeSaveNotifier } from "@/features/theme/components/theme-save-notifier";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { getWorkspaceTranslationsBulkAction } from "@/features/translation/actions";
import {
  WorkspaceTranslationProvider,
  useWorkspaceTranslations,
} from "@/features/translation/workspace-translation-context";
import {
  ThemeStudioShell,
  readSavedThemeSection,
  THEME_SECTION_STORAGE_KEY,
  isThemeStudioSectionId,
  type ThemeStudioSectionId,
} from "./theme-studio-shell";
import { useThemeStudio } from "./use-theme-studio";
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
  const { locales } = useAdminEditingLocale();
  const studio = useThemeStudio(base);
  const [section, setSection] = useState<ThemeStudioSectionId>("overview");
  const [previewAppearance, setPreviewAppearance] = useState<"light" | "dark">("light");
  const [compareMode, setCompareMode] = useState(false);
  const [translationRows, setTranslationRows] = useState<EntityTranslation[]>([]);
  const translationFlushRef = useRef<(() => Promise<void>) | null>(null);

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

  const loadThemeTranslations = useCallback(async () => {
    const rows = await getWorkspaceTranslationsBulkAction([
      { entityType: "SiteIdentity", entityId: "default" },
    ]);
    setTranslationRows(rows);
  }, []);

  useEffect(() => {
    void loadThemeTranslations();
  }, [loadThemeTranslations]);

  const onSave = useCallback(async () => {
    if (translationFlushRef.current) {
      await translationFlushRef.current();
    }
    const baseline = JSON.parse(studio.savedSnapshot) as Record<string, unknown>;
    const changes = computePatch(baseline, studio.state as Record<string, unknown>);
    if (isEmptyPatch(changes)) return true;
    await saveThemeDraftPatch(changes);
    studio.markSaved();
    document.cookie = "theme-preview=draft; path=/; max-age=3600";
    return true;
  }, [studio]);

  const onPublish = useCallback(async () => {
    if (translationFlushRef.current) {
      await translationFlushRef.current();
    }
    const baseline = JSON.parse(studio.savedSnapshot) as Record<string, unknown>;
    const changes = computePatch(baseline, studio.state as Record<string, unknown>);
    if (!isEmptyPatch(changes)) {
      await saveThemeDraftPatch(changes);
    }
    await publishTheme();
    studio.markSaved();
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

  const applyPresetAsDefault = useCallback(
    async (presetId: string) => {
      const response = await fetch("/api/manage/apply-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to apply preset to theme draft.");
      }

      await publishTheme();
      document.cookie = "theme-preview=; path=/; max-age=0";
      window.location.reload();
    },
    [],
  );

  const sectionProps = {
    studio,
    resolved: studio.resolved,
    draft,
    published,
    onNavigate: (id: string) => {
      if (isThemeStudioSectionId(id)) changeSection(id);
    },
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
        return <PresetsSection studio={studio} onApplyPresetAsDefault={applyPresetAsDefault} />;
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

  return (
    <WorkspaceTranslationProvider
      locales={locales}
      initialRows={translationRows}
      flushRef={translationFlushRef}
    >
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
        <ThemeTranslationDirtySync />
        <ThemeSaveNotifier />
        <DesignHubShell
          title="Theme Studio"
          description="Configure presets, colors, typography, motion, and effects. Open the Preview tab for live preview, then save and publish."
          preview={undefined}
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
    </WorkspaceTranslationProvider>
  );
}

function ThemeTranslationDirtySync() {
  const adminForm = useAdminFormOptional();
  const { hasPendingTranslations } = useWorkspaceTranslations();

  useEffect(() => {
    if (hasPendingTranslations) {
      adminForm?.setDirty(true);
    }
  }, [hasPendingTranslations, adminForm]);

  return null;
}
