"use client";

import { useCallback, useEffect, useState } from "react";
import type { SiteTheme } from "@prisma/client";
import Link from "next/link";
import { saveThemeDraft, publishTheme } from "@/features/theme/actions";
import { ColorPickerField } from "@/components/settings";
import { ThemeBrandUpload } from "./theme-brand-upload";
import { SiteIdentityPanel } from "./site-identity-panel";
import { ThemeDirtySync } from "./theme-dirty-sync";
import { ThemeSaveNotifier } from "./theme-save-notifier";
import {
  ThemeBuilderShell,
  readSavedThemeSection,
  THEME_SECTION_STORAGE_KEY,
  type ThemeSectionId,
} from "./theme-builder-shell";
import { AdminFormProvider } from "@/components/admin/layout/admin-form-provider";
import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BASE_FONT_SIZE_OPTIONS,
  GOOGLE_FONT_OPTIONS,
  THEME_PRESET_LABELS,
} from "@/features/theme/constants";
import {
  BACKGROUND_EFFECT_OPTIONS,
  CURSOR_EFFECT_OPTIONS,
  TEXT_EFFECT_OPTIONS,
} from "@/features/theme/effect-options";
import {
  CollapsibleSettingsGroup,
  EffectSelectField,
  EffectToggleGroup,
} from "@/features/theme/components/visual-controls";
import { ALL_PRESETS } from "@/features/theme/presets-catalog";
import { PRESET_STYLE_MAP } from "@/features/theme/presets/preset-style-map";
import {
  CARD_STYLE_OPTIONS,
  BORDER_STYLE_OPTIONS,
} from "@/features/theme/card-style-options";
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_TYPOGRAPHY,
  siteThemeToTokens,
} from "@/features/theme/theme-config";
import { THEME_PRESET_DEFAULTS } from "@/types/theme";
import type { ThemeTokens } from "@/types/theme";
import { normalizeBranding } from "@/features/navigation/branding-defaults";

type Props = {
  draft: SiteTheme | null;
  published: SiteTheme | null;
};

function themeFromRecord(theme: SiteTheme): ThemeTokens {
  return siteThemeToTokens(theme);
}

function createInitialThemeTokens(base: SiteTheme | null): ThemeTokens {
  if (base) return themeFromRecord(base);
  return {
    preset: "CLASSIC",
    activePresetId: null,
    primaryColor: "#047857",
    secondaryColor: "#d4af37",
    cursorEffect: null,
    backgroundEffect: null,
    textEffect: null,
    cursorEffectEnabled: true,
    backgroundEffectEnabled: true,
    textEffectEnabled: true,
    cardStyle: null,
    borderStyle: null,
    typography: DEFAULT_TYPOGRAPHY,
    faviconUrl: null,
    logoUrl: null,
    brandConfig: normalizeBranding({}),
    headerConfig: DEFAULT_HEADER_CONFIG,
    footerConfig: DEFAULT_FOOTER_CONFIG,
    animationsEnabled: true,
    animationSpeed: 1,
    lazyLoadEnabled: true,
    darkModeEnabled: false,
    spacingScale: 1,
    customCss: null,
  };
}

export function ThemeSettingsForm({ draft, published }: Props) {
  const base = draft ?? published;
  if (!base) {
    return <p>No theme configured. Run database seed.</p>;
  }

  return <ThemeSettingsFormContent draft={draft} published={published} base={base} />;
}

function ThemeSettingsFormContent({
  draft,
  published,
  base,
}: Props & { base: SiteTheme }) {
  const [section, setSection] = useState<ThemeSectionId>("look-and-feel");
  const [state, setState] = useState<ThemeTokens>(() => createInitialThemeTokens(base));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(createInitialThemeTokens(base)));

  useEffect(() => {
    setSection(readSavedThemeSection());
  }, []);

  useEffect(() => {
    const next = createInitialThemeTokens(base);
    setState(next);
    setSavedSnapshot(JSON.stringify(next));
  }, [base.updatedAt, base.id]);

  const changeSection = (next: ThemeSectionId) => {
    setSection(next);
    try {
      localStorage.setItem(THEME_SECTION_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const hasUnpublishedDraft = Boolean(draft && published && draft.updatedAt > published.updatedAt);

  const buildFormData = useCallback(() => {
    const fd = new FormData();
    fd.set("preset", state.preset);
    fd.set("primaryColor", state.primaryColor);
    fd.set("secondaryColor", state.secondaryColor);
    fd.set("typography", JSON.stringify(state.typography));
    fd.set("faviconUrl", state.faviconUrl ?? "");
    fd.set("logoUrl", state.logoUrl ?? "");
    fd.set("brandConfig", JSON.stringify(state.brandConfig));
    fd.set("headerConfig", JSON.stringify(state.headerConfig));
    fd.set("footerConfig", JSON.stringify(state.footerConfig));
    fd.set("animationsEnabled", state.animationsEnabled ? "true" : "false");
    fd.set("animationSpeed", String(state.animationSpeed));
    fd.set("lazyLoadEnabled", state.lazyLoadEnabled ? "true" : "false");
    fd.set("darkModeEnabled", state.darkModeEnabled ? "true" : "false");
    fd.set("spacingScale", String(state.spacingScale));
    fd.set("customCss", state.customCss ?? "");
    fd.set("activePresetId", state.activePresetId ?? "");
    fd.set("cursorEffect", state.cursorEffect ?? "");
    fd.set("backgroundEffect", state.backgroundEffect ?? "");
    fd.set("textEffect", state.textEffect ?? "");
    fd.set("cursorEffectEnabled", state.cursorEffectEnabled ? "true" : "false");
    fd.set("backgroundEffectEnabled", state.backgroundEffectEnabled ? "true" : "false");
    fd.set("textEffectEnabled", state.textEffectEnabled ? "true" : "false");
    fd.set("cardStyle", state.cardStyle ?? "");
    fd.set("borderStyle", state.borderStyle ?? "");
    return fd;
  }, [state]);

  const onSave = useCallback(async () => {
    await saveThemeDraft(buildFormData());
    setSavedSnapshot(JSON.stringify(state));
    document.cookie = "theme-preview=draft; path=/; max-age=3600";
  }, [buildFormData, state]);

  const onPublish = useCallback(async () => {
    await saveThemeDraft(buildFormData());
    await publishTheme();
    document.cookie = "theme-preview=; path=/; max-age=0";
    window.location.reload();
  }, [buildFormData]);

  const onPreview = useCallback(() => {
    document.cookie = "theme-preview=draft; path=/; max-age=3600";
    window.open("/en", "_blank");
  }, []);

  const onCancel = useCallback(() => {
    setState(JSON.parse(savedSnapshot) as ThemeTokens);
  }, [savedSnapshot]);

  const applyPresetColors = (preset: ThemeTokens["preset"]) => {
    const colors = THEME_PRESET_DEFAULTS[preset];
    if (preset !== "CUSTOM") {
      setState((s) => ({ ...s, preset, primaryColor: colors.primaryColor, secondaryColor: colors.secondaryColor }));
    } else {
      setState((s) => ({ ...s, preset }));
    }
  };

  const renderSection = (tabId: ThemeSectionId) => {
    switch (tabId) {
      case "look-and-feel":
        return (
          <div className="space-y-6">
            {/* Preset visual grid */}
            <Card>
              <CardHeader>
                <CardTitle>Style preset</CardTitle>
                <CardDescription>
                  Select an industry preset to instantly apply colors, effects, and card style. This
                  is the default look & feel for the site — block and page settings override it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {ALL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const style = PRESET_STYLE_MAP[preset.id];
                        setState((s) => ({
                          ...s,
                          activePresetId: preset.id,
                          primaryColor: preset.tokens.primary,
                          secondaryColor: preset.tokens.accent ?? s.secondaryColor,
                          backgroundEffect: preset.bg || s.backgroundEffect,
                          textEffect: preset.text || s.textEffect,
                          cursorEffect: preset.cursor || s.cursorEffect,
                          cardStyle: style?.cardStyle ?? s.cardStyle,
                          borderStyle: style?.borderStyle ?? s.borderStyle,
                        }));
                      }}
                      className={`group relative rounded-lg border p-2 text-left text-xs transition-all hover:-translate-y-0.5 ${
                        state.activePresetId === preset.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "hover:border-primary/40"
                      }`}
                    >
                      <div
                        className="mb-2 h-10 rounded transition-transform group-hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(135deg, ${preset.tokens.primary}, ${preset.tokens.accent || preset.tokens.primary})`,
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <span>{preset.emoji}</span>
                        <span className="truncate font-medium">{preset.label || preset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Effects quick-selectors */}
            <Card>
              <CardHeader>
                <CardTitle>Visual effects</CardTitle>
                <CardDescription>
                  Default background canvas, heading text animation, and cursor effect. Visitors
                  can override these in their personalization widget.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <EffectSelectField
                  label="Background"
                  value={state.backgroundEffect ?? ""}
                  options={BACKGROUND_EFFECT_OPTIONS}
                  onChange={(backgroundEffect) =>
                    setState((s) => ({ ...s, backgroundEffect: backgroundEffect || null }))
                  }
                />
                <EffectSelectField
                  label="Text effect"
                  value={state.textEffect ?? ""}
                  options={TEXT_EFFECT_OPTIONS}
                  onChange={(textEffect) =>
                    setState((s) => ({ ...s, textEffect: textEffect || null }))
                  }
                />
                <EffectSelectField
                  label="Cursor"
                  value={state.cursorEffect ?? ""}
                  options={CURSOR_EFFECT_OPTIONS}
                  onChange={(cursorEffect) =>
                    setState((s) => ({ ...s, cursorEffect: cursorEffect || null }))
                  }
                />
              </CardContent>
            </Card>

            {/* Card & border style */}
            <Card>
              <CardHeader>
                <CardTitle>Card & border style</CardTitle>
                <CardDescription>Surface styling applied globally unless overridden per block.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <EffectSelectField
                  label="Card style"
                  value={state.cardStyle ?? ""}
                  options={[...CARD_STYLE_OPTIONS]}
                  onChange={(cardStyle) =>
                    setState((s) => ({ ...s, cardStyle: cardStyle || null }))
                  }
                />
                <EffectSelectField
                  label="Border style"
                  value={state.borderStyle ?? ""}
                  options={[...BORDER_STYLE_OPTIONS]}
                  onChange={(borderStyle) =>
                    setState((s) => ({ ...s, borderStyle: borderStyle || null }))
                  }
                />
              </CardContent>
            </Card>

            {/* Dark mode + effect master switches */}
            <Card>
              <CardHeader>
                <CardTitle>Global switches</CardTitle>
                <CardDescription>Enable or disable site-wide features.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.darkModeEnabled}
                    onChange={(e) => setState((s) => ({ ...s, darkModeEnabled: e.target.checked }))}
                  />
                  Dark mode styling enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.animationsEnabled}
                    onChange={(e) =>
                      setState((s) => ({ ...s, animationsEnabled: e.target.checked }))
                    }
                  />
                  Animations enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.backgroundEffectEnabled}
                    onChange={(e) =>
                      setState((s) => ({ ...s, backgroundEffectEnabled: e.target.checked }))
                    }
                  />
                  Background canvas enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.cursorEffectEnabled}
                    onChange={(e) =>
                      setState((s) => ({ ...s, cursorEffectEnabled: e.target.checked }))
                    }
                  />
                  Custom cursor enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.textEffectEnabled}
                    onChange={(e) =>
                      setState((s) => ({ ...s, textEffectEnabled: e.target.checked }))
                    }
                  />
                  Text effects enabled
                </label>
              </CardContent>
            </Card>
          </div>
        );

      case "colors":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Theme preset</CardTitle>
              <CardDescription>Classic, Modern, Luxury, or fully custom colors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["CLASSIC", "MODERN", "LUXURY", "CUSTOM"] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPresetColors(preset)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      state.preset === preset ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50"
                    }`}
                  >
                    <span
                      className="me-2 inline-block h-4 w-4 rounded-full align-middle"
                      style={{ background: THEME_PRESET_DEFAULTS[preset].primaryColor }}
                    />
                    <span
                      className="me-1 inline-block h-4 w-4 rounded-full align-middle"
                      style={{ background: THEME_PRESET_DEFAULTS[preset].secondaryColor }}
                    />
                    {THEME_PRESET_LABELS[preset]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorPickerField
                  label="Primary color"
                  value={state.primaryColor}
                  onChange={(primaryColor) =>
                    setState((s) => ({ ...s, primaryColor, preset: "CUSTOM" }))
                  }
                />
                <ColorPickerField
                  label="Secondary / accent"
                  value={state.secondaryColor}
                  onChange={(secondaryColor) =>
                    setState((s) => ({ ...s, secondaryColor, preset: "CUSTOM" }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        );

      case "typography":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Fonts and type scale for the public site.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Body font</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border px-3"
                  value={state.typography.bodyFont}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      typography: { ...s.typography, bodyFont: e.target.value },
                    }))
                  }
                >
                  {GOOGLE_FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Heading font</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border px-3"
                  value={state.typography.headingFont}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      typography: { ...s.typography, headingFont: e.target.value },
                    }))
                  }
                >
                  {GOOGLE_FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Base font size</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border px-3"
                  value={state.typography.baseFontSize}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      typography: { ...s.typography, baseFontSize: e.target.value },
                    }))
                  }
                >
                  {BASE_FONT_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Heading scale ({state.typography.headingScale})</Label>
                <input
                  type="range"
                  min={1}
                  max={1.5}
                  step={0.05}
                  value={state.typography.headingScale}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      typography: { ...s.typography, headingScale: Number(e.target.value) },
                    }))
                  }
                  className="mt-2 w-full"
                />
              </div>
            </CardContent>
          </Card>
        );

      case "branding":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site assets</CardTitle>
                <CardDescription>Global logo and favicon fallbacks used across the site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ThemeBrandUpload
                  label="Website logo"
                  value={state.logoUrl ?? ""}
                  onChange={(url) => setState((s) => ({ ...s, logoUrl: url || null }))}
                  previewSize={{ width: 160, height: 48 }}
                />
                <ThemeBrandUpload
                  label="Favicon"
                  hint="Square image recommended (32×32 or 64×64)."
                  value={state.faviconUrl ?? ""}
                  onChange={(url) => setState((s) => ({ ...s, faviconUrl: url || null }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Site identity</CardTitle>
                <CardDescription>Brand name, tagline, and header logo display settings.</CardDescription>
              </CardHeader>
              <CardContent>
                <SiteIdentityPanel
                  brandConfig={state.brandConfig}
                  onChange={(brandConfig) => setState((s) => ({ ...s, brandConfig }))}
                />
              </CardContent>
            </Card>
          </div>
        );

      case "motion":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Motion & performance</CardTitle>
              <CardDescription>Animation, lazy loading, dark mode, and spacing defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.animationsEnabled}
                  onChange={(e) => setState((s) => ({ ...s, animationsEnabled: e.target.checked }))}
                />
                Enable animations
              </label>
              <div>
                <Label>Animation speed ({state.animationSpeed}x)</Label>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={state.animationSpeed}
                  onChange={(e) => setState((s) => ({ ...s, animationSpeed: Number(e.target.value) }))}
                  className="mt-2 w-full"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.lazyLoadEnabled}
                  onChange={(e) => setState((s) => ({ ...s, lazyLoadEnabled: e.target.checked }))}
                />
                Lazy-load images
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.darkModeEnabled}
                  onChange={(e) => setState((s) => ({ ...s, darkModeEnabled: e.target.checked }))}
                />
                Dark mode styling enabled (toggle always available in personalization widget)
              </label>
              <div>
                <Label>Global spacing scale ({state.spacingScale})</Label>
                <input
                  type="range"
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  value={state.spacingScale}
                  onChange={(e) => setState((s) => ({ ...s, spacingScale: Number(e.target.value) }))}
                  className="mt-2 w-full"
                />
              </div>
            </CardContent>
          </Card>
        );

      case "effects":
        return (
          <div className="space-y-4">
            <CollapsibleSettingsGroup
              title="Master switches"
              description="Disable effect types site-wide without clearing your selections."
              defaultOpen
            >
              <EffectToggleGroup
                items={[
                  {
                    id: "cursor",
                    label: "Cursor",
                    checked: state.cursorEffectEnabled,
                    onChange: (checked) =>
                      setState((s) => ({ ...s, cursorEffectEnabled: checked })),
                  },
                  {
                    id: "background",
                    label: "Background canvas",
                    checked: state.backgroundEffectEnabled,
                    onChange: (checked) =>
                      setState((s) => ({ ...s, backgroundEffectEnabled: checked })),
                  },
                  {
                    id: "text",
                    label: "Text effects",
                    checked: state.textEffectEnabled,
                    onChange: (checked) => setState((s) => ({ ...s, textEffectEnabled: checked })),
                  },
                ]}
              />
            </CollapsibleSettingsGroup>

            <CollapsibleSettingsGroup
              title="Background canvas"
              description="Animated site-wide background (not applied per block)."
            >
              <EffectSelectField
                label="Background effect"
                value={state.backgroundEffect ?? ""}
                options={BACKGROUND_EFFECT_OPTIONS}
                onChange={(backgroundEffect) =>
                  setState((s) => ({ ...s, backgroundEffect: backgroundEffect || null }))
                }
              />
            </CollapsibleSettingsGroup>

            <CollapsibleSettingsGroup title="Cursor" description="Custom cursor trail or glow.">
              <EffectSelectField
                label="Cursor effect"
                value={state.cursorEffect ?? ""}
                options={CURSOR_EFFECT_OPTIONS}
                onChange={(cursorEffect) =>
                  setState((s) => ({ ...s, cursorEffect: cursorEffect || null }))
                }
              />
            </CollapsibleSettingsGroup>

            <CollapsibleSettingsGroup
              title="Text (theme default)"
              description="Default heading text animation for hero titles."
            >
              <EffectSelectField
                label="Text effect"
                value={state.textEffect ?? ""}
                options={TEXT_EFFECT_OPTIONS}
                onChange={(textEffect) =>
                  setState((s) => ({ ...s, textEffect: textEffect || null }))
                }
              />
            </CollapsibleSettingsGroup>

            <CollapsibleSettingsGroup title="Card & border" description="Surface styling tokens.">
              <div className="grid gap-4 sm:grid-cols-2">
                <EffectSelectField
                  label="Card style"
                  value={state.cardStyle ?? ""}
                  options={[...CARD_STYLE_OPTIONS]}
                  onChange={(cardStyle) =>
                    setState((s) => ({ ...s, cardStyle: cardStyle || null }))
                  }
                />
                <EffectSelectField
                  label="Border style"
                  value={state.borderStyle ?? ""}
                  options={[...BORDER_STYLE_OPTIONS]}
                  onChange={(borderStyle) =>
                    setState((s) => ({ ...s, borderStyle: borderStyle || null }))
                  }
                />
              </div>
            </CollapsibleSettingsGroup>

            <CollapsibleSettingsGroup title="Industry preset">
              <p className="text-sm text-muted-foreground">
                Apply an industry preset from{" "}
                <Link href="/admin/presets" className="text-primary underline">
                  Presets
                </Link>{" "}
                to pre-fill colors and effects.
                {state.activePresetId ? (
                  <>
                    {" "}
                    Active: <strong>{state.activePresetId}</strong>
                  </>
                ) : null}
              </p>
            </CollapsibleSettingsGroup>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom CSS</CardTitle>
                <CardDescription>Injected after theme variables on publish.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={10}
                  value={state.customCss ?? ""}
                  onChange={(e) => setState((s) => ({ ...s, customCss: e.target.value || null }))}
                  className="font-mono text-sm"
                  placeholder=":root { } or .my-class { }"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Header & footer</CardTitle>
                <CardDescription>Structure and visibility are configured in the dedicated builders.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/header">Open Header Builder</Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/footer">Open Footer Builder</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminFormProvider onSave={onSave} onPublish={onPublish} onPreview={onPreview} onCancel={onCancel}>
      <ThemeDirtySync state={state} savedSnapshot={savedSnapshot} />
      <ThemeSaveNotifier />
      <DesignHubShell
        title="Theme"
        description="Preset colors, typography, site identity, motion, and custom CSS. Use the top bar to save, preview, and publish."
      >
        {hasUnpublishedDraft ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Draft has unpublished changes. Publish when ready.
          </p>
        ) : null}

        <ThemeBuilderShell activeSection={section} onSectionChange={changeSection}>
          {renderSection}
        </ThemeBuilderShell>
      </DesignHubShell>
    </AdminFormProvider>
  );
}
