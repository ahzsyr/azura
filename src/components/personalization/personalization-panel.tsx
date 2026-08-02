"use client";

import "@/styles/personalization-panel.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp, Globe, Monitor, Moon, Smartphone, Sun, Palette } from "lucide-react";
import { ALL_PRESETS, type PresetMeta } from "@/features/theme/presets-catalog";
import { CURSOR_EFFECT_OPTIONS } from "@/features/theme/effect-options";
import type { LocaleOption } from "@/components/layout/locale-switcher";
import type { PersonalizationSettings } from "@/capabilities/personalization/personalization.service";
import type { ThemeTokens } from "@/types/theme";
import { useThemeEngine } from "@/components/theme/theme-engine-provider";
import { getDirection } from "@/i18n/routing";
import { useIsMobileViewport } from "@/lib/hooks/use-is-mobile-viewport";
import { CompareWidgetFab, useCompareFabState } from "@/features/comparison/components/compare-widget-fab";
import { cn } from "@/lib/utils";

type Props = {
  settings: PersonalizationSettings;
  theme: ThemeTokens | null;
  locale?: string;
  locales?: LocaleOption[];
};

function openLocaleDialog() {
  document.getElementById("locale-switcher-trigger")?.click();
}

function getLocaleShortCode(locale: string, locales: LocaleOption[]): string {
  const active = locales.find((l) => l.urlPrefix === locale || l.code === locale);
  const raw = active?.urlPrefix ?? active?.code ?? locale;
  return raw.slice(0, 2).toUpperCase();
}

function FabQuickControls({
  engine,
  locale,
  locales,
  showMode,
  themeLabel,
}: {
  engine: ReturnType<typeof useThemeEngine>;
  locale: string;
  locales: LocaleOption[];
  showMode: boolean;
  themeLabel: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!showMode) return null;

  const isDark = engine.resolvedAppearance === "dark";
  const ThemeIcon = isDark ? Moon : Sun;

  if (!mounted) {
    return (
      <div className="pp-fab-circles" aria-hidden>
        {showMode ? <span className="pp-fab-circle pp-fab-circle--skeleton" /> : null}
      </div>
    );
  }

  return (
    <div className="pp-fab-circles" role="group" aria-label={themeLabel}>
      {showMode ? (
        <button
          type="button"
          className="pp-fab-circle pp-fab-circle--active"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={() => engine.toggleLightDark()}
          suppressHydrationWarning
        >
          <ThemeIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function FabLanguageButton({
  locale,
  locales,
  label,
}: {
  locale: string;
  locales: LocaleOption[];
  label: string;
}) {
  const activeLocale =
    locales.find((l) => l.urlPrefix === locale || l.code === locale) ?? locales[0];
  const localeCode = getLocaleShortCode(locale, locales);

  return (
    <button
      type="button"
      className="pp-language-fab-btn"
      aria-label={label}
      title={activeLocale?.label ?? label}
      onClick={openLocaleDialog}
    >
      <Globe className="pp-language-fab-btn__icon h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="pp-language-fab-btn__code">{localeCode}</span>
    </button>
  );
}

function SystemAppearanceIcon({ className }: { className?: string }) {
  const isMobile = useIsMobileViewport();
  const Icon = isMobile ? Smartphone : Monitor;
  return <Icon className={className} strokeWidth={2} aria-hidden />;
}

function AppearanceStatusCircles({
  engine,
  locale,
  locales,
  onOpenStyleTab,
  themeLabel,
  localeLabel,
  presetLabel,
}: {
  engine: ReturnType<typeof useThemeEngine>;
  locale: string;
  locales: LocaleOption[];
  onOpenStyleTab: () => void;
  themeLabel: string;
  localeLabel: string;
  presetLabel: string;
}) {
  const isMobileViewport = useIsMobileViewport();
  const activeLocale =
    locales.find((l) => l.urlPrefix === locale || l.code === locale) ?? locales[0];

  const catalogPreset = engine.effectivePresetId
    ? ALL_PRESETS.find((p) => p.id === engine.effectivePresetId)
    : undefined;
  const userPreset = engine.userPresets.find((p) => p.id === engine.effectivePresetId);
  const presetPrimary =
    catalogPreset?.tokens.primary ??
    userPreset?.colors.primary ??
    "color-mix(in srgb, var(--color-primary, var(--primary)) 40%, transparent)";
  const presetAccent =
    catalogPreset?.tokens.accent ??
    userPreset?.colors.accent ??
    presetPrimary;

  const ThemeIcon =
    engine.appearanceMode === "system"
      ? isMobileViewport
        ? Smartphone
        : Monitor
      : engine.resolvedAppearance === "dark"
        ? Moon
        : Sun;

  return (
    <div className="pp-status-circles" role="group" aria-label={themeLabel}>
      <button
        type="button"
        className="pp-status-circle pp-status-circle--active"
        aria-label={themeLabel}
        title={themeLabel}
        onClick={() => engine.toggleLightDark()}
      >
        <ThemeIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
      {locales.length > 1 ? (
        <button
          type="button"
          className="pp-status-circle pp-status-circle--active"
          aria-label={localeLabel}
          title={activeLocale?.label ?? localeLabel}
          onClick={openLocaleDialog}
        >
          <span className="pp-status-circle__code" aria-hidden>
            {getLocaleShortCode(locale, locales)}
          </span>
        </button>
      ) : null}
      <button
        type="button"
        className={cn(
          "pp-status-circle",
          engine.effectivePresetId && "pp-status-circle--active",
        )}
        aria-label={presetLabel}
        title={
          catalogPreset?.label ??
          userPreset?.name ??
          presetLabel
        }
        onClick={onOpenStyleTab}
      >
        <span
          className="pp-status-circle__swatch"
          style={{
            background: `linear-gradient(135deg, ${presetPrimary}, ${presetAccent})`,
          }}
          aria-hidden
        />
      </button>
    </div>
  );
}

function CursorEffectPicker({
  engine,
  theme,
  label,
  hint,
}: {
  engine: ReturnType<typeof useThemeEngine>;
  theme: ThemeTokens | null;
  label: string;
  hint: string;
}) {
  const selectedValue =
    engine.cursorPreference === "normal"
      ? ""
      : (engine.cursorEffect ?? theme?.cursorEffect ?? "");

  return (
    <div className="border-t border-border/50 pt-3">
      <p className="pp-section-label mb-2">{label}</p>
      <select
        className="pp-cursor-select"
        value={selectedValue}
        aria-label={label}
        onChange={(event) => engine.setVisitorCursorEffect(event.target.value || null)}
      >
        {CURSOR_EFFECT_OPTIONS.map((option) => (
          <option key={option.value || "default"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

type PanelTab = "appearance" | "style";

const positionClass: Record<PersonalizationSettings["position"], string> = {
  "bottom-end": "pp-pos-bottom-end",
  "bottom-start": "pp-pos-bottom-start",
  "top-end": "pp-pos-top-end",
  "top-start": "pp-pos-top-start",
};

const panelVariants = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  enter: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
};

const panelTransition = {
  duration: 0.22,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

function ThemePillSwitch({
  mode,
  resolved,
  onToggle,
}: {
  mode: "light" | "dark" | "system";
  resolved: "light" | "dark";
  onToggle: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className="pp-theme-switch pp-theme-switch--light inline-flex shrink-0"
        aria-hidden
      >
        <span className="pp-theme-switch__track">
          <span className="pp-theme-switch__thumb" />
        </span>
      </span>
    );
  }

  const isDark = resolved === "dark";
  const isSystem = mode === "system";

  return (
    <button
      type="button"
      className={cn(
        "pp-theme-switch",
        isSystem && "pp-theme-switch--system",
        !isSystem && (isDark ? "pp-theme-switch--dark" : "pp-theme-switch--light"),
      )}
      role="switch"
      aria-checked={isSystem ? "mixed" : isDark}
      aria-label="Toggle light or dark mode"
      onClick={onToggle}
      suppressHydrationWarning
    >
      <span className="pp-theme-switch__track">
        <span className="pp-theme-switch__icon pp-theme-switch__icon--sun" aria-hidden>
          <Sun className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="pp-theme-switch__thumb" aria-hidden suppressHydrationWarning>
          {isDark ? <Moon className="h-3 w-3" strokeWidth={2} /> : <Sun className="h-3 w-3" strokeWidth={2} />}
        </span>
        <span className="pp-theme-switch__icon pp-theme-switch__icon--moon" aria-hidden>
          <Moon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </span>
    </button>
  );
}

export function PersonalizationPanel({ settings, theme, locale = "en", locales = [] }: Props) {
  const t = useTranslations("widget");
  const tCompare = useTranslations("compare");
  const engine = useThemeEngine();
  const [open, setOpen] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [confirmFlash, setConfirmFlash] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [dir, setDir] = useState<"ltr" | "rtl">(() => getDirection(locale));
  const isMobileViewport = useIsMobileViewport();

  const {
    showAppearance,
    showStyle,
    showFabThemeToggle,
    showBackToTop,
  } = settings.widgetSections;

  const [canScrollTop, setCanScrollTop] = useState(false);
  const { visible: showCompareFab } = useCompareFabState();

  const enabledTabs = useMemo<PanelTab[]>(() => {
    const tabs: PanelTab[] = [];
    if (showAppearance) tabs.push("appearance");
    if (showStyle) tabs.push("style");
    return tabs;
  }, [showAppearance, showStyle]);

  const hasPanelContent = enabledTabs.length > 0;

  const [activeTab, setActiveTab] = useState<PanelTab>(() =>
    showStyle ? "style" : showAppearance ? "appearance" : "style",
  );

  const visiblePresets = useMemo((): PresetMeta[] => {
    const visible = new Set(settings.presets.filter((p) => p.visibleToUsers).map((p) => p.id));
    return ALL_PRESETS.filter((p) => visible.has(p.id));
  }, [settings.presets]);

  const userPresetsInPanel = engine.userPresets;
  const catalogPresetLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const preset of ALL_PRESETS) {
      map.set(preset.id, preset.label || preset.name || preset.id);
    }
    return map;
  }, []);
  const userPresetLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const preset of userPresetsInPanel) {
      map.set(preset.id, preset.name || preset.id);
    }
    return map;
  }, [userPresetsInPanel]);
  const resolvePresetLabel = (presetId: string | null, fallback: string): string => {
    if (!presetId) return fallback;
    return (
      userPresetLabelById.get(presetId) ??
      catalogPresetLabelById.get(presetId) ??
      presetId
    );
  };
  const [resolvedLocales, setResolvedLocales] = useState<LocaleOption[]>(locales);

  useEffect(() => {
    const htmlDir = document.documentElement.getAttribute("dir");
    if (htmlDir === "rtl" || htmlDir === "ltr") {
      setDir(htmlDir);
      return;
    }
    setDir(getDirection(locale));
  }, [locale]);

  useEffect(() => {
    const root = document.documentElement;
    const syncFromDocument = () => {
      const htmlDir = root.getAttribute("dir");
      if (htmlDir === "rtl" || htmlDir === "ltr") {
        setDir(htmlDir);
      }
    };

    syncFromDocument();

    const observer = new MutationObserver(syncFromDocument);
    observer.observe(root, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (locales.length > 1) {
      setResolvedLocales(locales);
      return;
    }

    let cancelled = false;
    fetch("/api/locales")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.items?.length) {
          if (!cancelled && locales.length > 0) setResolvedLocales(locales);
          return;
        }
        const fetched = data.items
          .filter((item: LocaleOption) => item.isEnabled !== false)
          .map((item: LocaleOption) => ({
            code: item.code,
            urlPrefix: item.urlPrefix,
            label: item.label,
            flag: item.flag,
            isEnabled: true,
          }));
        setResolvedLocales(fetched.length > 0 ? fetched : locales);
      })
      .catch(() => {
        if (!cancelled) setResolvedLocales(locales);
      });

    return () => {
      cancelled = true;
    };
  }, [locales]);

  const hasMultipleLocales = resolvedLocales.length > 1;

  useEffect(() => {
    if (!enabledTabs.includes(activeTab)) {
      setActiveTab(enabledTabs[0] ?? "style");
    }
  }, [enabledTabs, activeTab]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (widgetRef.current && !widgetRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!showBackToTop) {
      setCanScrollTop(false);
      return;
    }
    const threshold = 320;
    const onScroll = () => setCanScrollTop(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showBackToTop]);

  const showFabQuickControls = showFabThemeToggle || hasMultipleLocales;

  const showBackToTopControl = showBackToTop && canScrollTop;

  if (!settings.enabled) return null;
  if (!showFabQuickControls && !hasPanelContent && !showBackToTopControl && !showCompareFab) return null;

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  async function selectPreset(preset: PresetMeta) {
    setApplyingPreset(preset.id);
    setPresetError(null);
    const result = await engine.applyCatalogPreset(preset.id);
    setApplyingPreset(null);
    if (result.ok) {
      setConfirmFlash(true);
      window.setTimeout(() => setConfirmFlash(false), 1200);
    } else {
      if (result.reason === "unavailable") {
        setPresetError(
          `Could not apply "${preset.label}". This preset is not available in the current runtime source.`,
        );
      } else {
        setPresetError(
          result.message ||
            `Could not apply "${preset.label}" due to a request error. Please try again.`,
        );
      }
    }
  }

  const tabDefs: Array<{ id: PanelTab; icon: React.ReactNode; label: string }> = [
    { id: "appearance", icon: <Sun className="h-3.5 w-3.5" />, label: "Appearance" },
    { id: "style", icon: <Palette className="h-3.5 w-3.5" />, label: "Style" },
  ];

  const visibleTabDefs = tabDefs.filter((tab) => enabledTabs.includes(tab.id));

  const PanelContent = (
    <div className="flex flex-col gap-0">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-primary">✦</span>
          {t("personalize")}
        </span>
        <button
          type="button"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setOpen(false)}
        >
          {t("close")}
        </button>
      </div>

      {visibleTabDefs.length > 1 && (
        <div className="mb-3 flex gap-1 rounded-lg bg-muted/40 p-0.5">
          {visibleTabDefs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background/80 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {showAppearance && activeTab === "appearance" && (
        <div className="space-y-3">
          <p className="pp-section-label mb-0">{t("appearance")}</p>
          <AppearanceStatusCircles
            engine={engine}
            locale={locale}
            locales={resolvedLocales}
            onOpenStyleTab={() => setActiveTab("style")}
            themeLabel={t("activeTheme")}
            localeLabel={t("language")}
            presetLabel={t("activePreset")}
          />
          <div className="pp-mode-row">
            <ThemePillSwitch
              mode={engine.appearanceMode}
              resolved={engine.resolvedAppearance}
              onToggle={() => engine.toggleLightDark()}
            />
            <button
              type="button"
              className={cn(
                "pp-system-chip",
                engine.appearanceMode === "system" && "pp-system-chip--active",
              )}
              aria-pressed={engine.appearanceMode === "system"}
              onClick={() => engine.setAppearanceMode("system", { animate: true })}
            >
              <SystemAppearanceIcon className="mx-auto mb-0.5 h-3.5 w-3.5" />
              System
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t("appearanceHint")}
          </p>
          {hasMultipleLocales ? (
            <div className="border-t border-border/50 pt-3">
              <p className="pp-section-label mb-2">{t("language")}</p>
              <button
                type="button"
                className="pp-language-btn"
                onClick={openLocaleDialog}
              >
                <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="pp-language-btn__flag" aria-hidden>
                  {resolvedLocales.find((l) => l.urlPrefix === locale || l.code === locale)?.flag ?? "🌐"}
                </span>
                <span className="min-w-0 flex-1 truncate text-start text-xs font-medium">
                  {resolvedLocales.find((l) => l.urlPrefix === locale || l.code === locale)?.label ?? locale}
                </span>
                <span className="text-[10px] text-muted-foreground">{t("changeLanguage")}</span>
              </button>
            </div>
          ) : null}
          {theme?.cursorEffectEnabled !== false && !isMobileViewport ? (
            <CursorEffectPicker
              engine={engine}
              theme={theme}
              label={t("cursorEffect")}
              hint={t("cursorEffectHint")}
            />
          ) : null}
        </div>
      )}

      {showStyle && activeTab === "style" && (
        <div className="space-y-3">
          <p className="pp-section-label mb-0">Style Preset</p>
          <div className="pp-presets-grid">
            {visiblePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={applyingPreset === preset.id}
                onClick={() => selectPreset(preset)}
                className={cn(
                  "pp-preset-btn",
                  engine.effectivePresetId === preset.id && "pp-preset-btn--active",
                )}
                aria-pressed={engine.effectivePresetId === preset.id}
                title={preset.description}
              >
                <div
                  className="pp-preset-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${preset.tokens.primary}, ${preset.tokens.accent || preset.tokens.primary})`,
                  }}
                />
                <span className="pp-preset-name">
                  <span className="me-1">{preset.emoji}</span>
                  {preset.label || preset.name}
                </span>
              </button>
            ))}
            {userPresetsInPanel.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => engine.applyUserPreset(preset)}
                className={cn(
                  "pp-preset-btn",
                  engine.effectivePresetId === preset.id && "pp-preset-btn--active",
                )}
                aria-pressed={engine.effectivePresetId === preset.id}
              >
                <div
                  className="pp-preset-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors.primary}, ${preset.colors.accent})`,
                  }}
                />
                <span className="pp-preset-name">{preset.name}</span>
              </button>
            ))}
          </div>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <p>
              Site default:{" "}
              <span className="font-medium text-foreground">
                {resolvePresetLabel(engine.siteDefaultPresetId, "None")}
              </span>
            </p>
            <p>
              Your selection:{" "}
              <span className="font-medium text-foreground">
                {resolvePresetLabel(engine.visitorPresetId, "Using site default")}
              </span>
            </p>
          </div>
          {presetError ? (
            <p className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[10px] text-red-700">
              {presetError}
            </p>
          ) : null}
          <button
            type="button"
            className="w-full rounded-md border border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            onClick={() => {
              engine.resetVisitorTheme();
              setConfirmFlash(true);
              window.setTimeout(() => setConfirmFlash(false), 1200);
            }}
          >
            {t("resetToSiteDefault")}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={widgetRef}
      id="az-pp"
      dir={dir}
      className={cn("pp-root", positionClass[settings.position])}
      aria-label={t("ariaLabel")}
    >
      <AnimatePresence>
        {open &&
          hasPanelContent &&
          (reducedMotion ? (
            <div className="pp-panel" role="dialog" aria-label="Theme preferences">
              {PanelContent}
            </div>
          ) : (
            <motion.div
              key="personalization-panel"
              initial="initial"
              animate="enter"
              exit="exit"
              variants={panelVariants}
              transition={panelTransition}
              className="pp-panel"
              role="dialog"
              aria-label="Theme preferences"
            >
              {PanelContent}
            </motion.div>
          ))}
      </AnimatePresence>

      {(showFabQuickControls || hasPanelContent || showBackToTopControl || showCompareFab) && (
        <div className="pp-float-bar">
          {showFabThemeToggle ? (
            <FabQuickControls
              engine={engine}
              locale={locale}
              locales={resolvedLocales}
              showMode
              themeLabel={t("activeTheme")}
            />
          ) : null}
          <CompareWidgetFab label={tCompare("drawerTitle")} locale={locale} />
          {hasMultipleLocales ? (
            <FabLanguageButton
              locale={locale}
              locales={resolvedLocales}
              label={t("language")}
            />
          ) : null}
          {hasPanelContent && (
            <button
              type="button"
              className={cn("pp-presets-btn", open && "pp-presets-btn--open")}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="az-pp"
            >
              <span className="pp-presets-btn__icon" aria-hidden>
                {confirmFlash ? "✓" : "✦"}
              </span>
              <span className="hidden sm:inline">{t("style")}</span>
            </button>
          )}
          {showBackToTopControl ? (
            <button
              type="button"
              className="pp-back-top-btn pp-back-top-btn--visible"
              onClick={scrollToTop}
              aria-label={t("backToTop")}
              title={t("backToTop")}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              <span className="hidden sm:inline">{t("backToTop")}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
