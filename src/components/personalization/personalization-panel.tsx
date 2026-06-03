"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Monitor, Moon, Sun, Palette } from "lucide-react";
import { ALL_PRESETS, type PresetMeta } from "@/features/theme/presets-catalog";
import type { PersonalizationSettings } from "@/features/personalization/personalization.service";
import type { ThemeTokens } from "@/types/theme";
import { useThemeEngine } from "@/components/theme/theme-engine-provider";
import {
  readStoredPresetColors,
  readStoredPresetEffects,
  readStoredPresetVisual,
} from "@/features/theme/engine";
import { getDirection } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Props = {
  settings: PersonalizationSettings;
  theme: ThemeTokens | null;
  locale?: string;
};

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

export function PersonalizationPanel({ settings, theme, locale = "en" }: Props) {
  const t = useTranslations("widget");
  const engine = useThemeEngine();
  const [open, setOpen] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [confirmFlash, setConfirmFlash] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const dir = getDirection(locale);

  const { showAppearance, showStyle, showFabThemeToggle } = settings.widgetSections ?? {
    showAppearance: true,
    showStyle: true,
    showFabThemeToggle: true,
  };

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

  if (!settings.enabled) return null;
  if (!showFabThemeToggle && !hasPanelContent) return null;

  async function selectPreset(preset: PresetMeta) {
    setApplyingPreset(preset.id);
    const ok = await engine.applyCatalogPreset(preset.id);
    setApplyingPreset(null);
    if (ok) {
      setConfirmFlash(true);
      window.setTimeout(() => setConfirmFlash(false), 1200);
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
              onClick={() => engine.setAppearanceMode("system")}
            >
              <Monitor className="mx-auto mb-0.5 h-3.5 w-3.5" />
              System
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Light, dark, and system modes apply instantly without reloading the page.
          </p>
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
                  engine.activePresetId === preset.id && "pp-preset-btn--active",
                )}
                aria-pressed={engine.activePresetId === preset.id}
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
                  engine.activePresetId === preset.id && "pp-preset-btn--active",
                )}
                aria-pressed={engine.activePresetId === preset.id}
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
          {engine.activePresetId && (
            <p className="text-[10px] text-muted-foreground">
              Active: <span className="font-medium text-foreground">{engine.activePresetId}</span>
            </p>
          )}
          <button
            type="button"
            className="w-full rounded-lg border border-dashed border-primary/30 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/5"
            onClick={() => {
              const colors = readStoredPresetColors();
              if (!colors) return;
              const fx = readStoredPresetEffects();
              const visual = readStoredPresetVisual();
              const name = `My style ${engine.userPresets.length + 1}`;
              const saved = engine.saveUserCreatedPreset({
                name,
                colors,
                cursor: fx?.cursor,
                backgroundEffect: fx?.backgroundEffect ?? visual?.backgroundEffect,
                textEffect: fx?.textEffect ?? visual?.textEffect,
                cardStyle: fx?.cardStyle ?? visual?.cardStyle,
                borderStyle: fx?.borderStyle ?? visual?.borderStyle,
              });
              engine.applyUserPreset(saved);
            }}
          >
            Save current look
          </button>
        </div>
      )}

      {theme?.cursorEffectEnabled !== false && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <p className="pp-section-label">Pointer</p>
          <div className="pp-cursor-row" role="group" aria-label="Cursor style">
            <button
              type="button"
              className={cn(
                "pp-cursor-btn",
                engine.cursorPreference === "custom" && "pp-cursor-btn--active",
              )}
              aria-pressed={engine.cursorPreference === "custom"}
              onClick={() => engine.setCursorPreference("custom")}
            >
              <span>✦</span>
              <span>Custom</span>
            </button>
            <button
              type="button"
              className={cn(
                "pp-cursor-btn",
                engine.cursorPreference === "normal" && "pp-cursor-btn--active",
              )}
              aria-pressed={engine.cursorPreference === "normal"}
              onClick={() => engine.setCursorPreference("normal")}
            >
              <span>↖</span>
              <span>Normal</span>
            </button>
          </div>
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
      <div className="pp-float-bar">
        {showFabThemeToggle && (
          <ThemePillSwitch
            mode={engine.appearanceMode}
            resolved={engine.resolvedAppearance}
            onToggle={() => engine.toggleLightDark()}
          />
        )}
        {hasPanelContent && (
          <button
            type="button"
            className={cn("pp-presets-btn", open && "pp-presets-btn--open")}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span className="pp-presets-btn__icon" aria-hidden>
              {confirmFlash ? "✓" : "✦"}
            </span>
            <span className="hidden sm:inline">{t("style")}</span>
          </button>
        )}
      </div>

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
    </div>
  );
}
