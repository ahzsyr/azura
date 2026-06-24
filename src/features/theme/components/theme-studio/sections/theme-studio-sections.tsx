"use client";

import Link from "next/link";
import type { SiteTheme } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  CARD_STYLE_OPTIONS,
  BORDER_STYLE_OPTIONS,
} from "@/features/theme/card-style-options";
import { CollapsibleSettingsGroup, EffectSelectField, EffectToggleGroup } from "@/features/theme/components/visual-controls";
import { ThemeBrandUpload } from "@/features/theme/components/theme-brand-upload";
import { SiteIdentityPanel } from "@/features/theme/components/site-identity-panel";
import { THEME_PRESET_DEFAULTS } from "@/types/theme";
import type { ThemeTokens } from "@/types/theme";
import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import {
  ThemeColorPicker,
  ThemeSectionCard,
  ThemeSelect,
  ThemeSlider,
  ThemeToggle,
} from "../controls";
import { computePerformanceScore } from "../resolve-theme-client";
import type { ThemeStudioApi } from "../use-theme-studio";
import { PresetsManager } from "../presets-manager";
import { ThemePreviewPanel } from "../theme-preview-panel";
import type { AdminLocale } from "@/i18n/locale-config";
import { useAdminEditingLocale } from "@/features/translation/hooks/use-admin-editing-locale";
import { resolveLocaleFonts } from "@/lib/theme/locale-fonts";
import { LocaleFontPreview } from "../locale-font-preview";
import { useTypographyFontLoader } from "../use-typography-font-loader";

type SectionProps = {
  studio: ThemeStudioApi;
  resolved: ResolvedTheme;
  draft: SiteTheme | null;
  published: SiteTheme | null;
  onNavigate: (section: string) => void;
  compareMode: boolean;
  onCompareModeChange: (value: boolean) => void;
  previewAppearance: "light" | "dark";
  onPreviewAppearanceChange: (value: "light" | "dark") => void;
};

const themeTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatThemeTimestamp(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return `${themeTimestampFormatter.format(new Date(value))} UTC`;
}

export function OverviewSection({ resolved, draft, published, onNavigate, studio }: SectionProps) {
  const score = computePerformanceScore(resolved);
  const scoreTone =
    score >= 80 ? "default" : score >= 60 ? "secondary" : "outline";
  const provenance = studio.state.themeProvenance;
  const provenanceStatus = provenance?.customizedAfterPreset ? "Customized" : "Matches preset";

  return (
    <div className="space-y-6">
      <ThemeSectionCard title="Theme status" description="Current draft snapshot at a glance.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Site default preset"
            value={studio.state.siteDefaultPresetId ?? resolved.preset.presetId ?? resolved.preset.preset}
            probeKey="theme-site-default-preset"
          />
          <Stat
            label="Based on preset"
            value={provenance?.sourcePresetId ?? "Manual / none"}
            probeKey="theme-provenance-source"
          />
          <Stat
            label="Preset status"
            value={provenanceStatus}
            probeKey="theme-provenance-status"
          />
          <Stat
            label="Appearance default"
            value={resolved.appearance.mode}
            probeKey="theme-appearance-default"
          />
          <Stat label="Motion level" value={resolved.motion.level} probeKey="theme-motion-level" />
          <Stat label="Card style" value={resolved.cardStyle ?? "—"} probeKey="theme-card-style" />
          <Stat
            label="Border style"
            value={resolved.borderStyle ?? "—"}
            probeKey="theme-border-style"
          />
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Performance score</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="text-lg font-semibold tabular-nums"
                data-hydration-probe="theme-performance-score"
              >
                {score}
              </span>
              <Badge variant={scoreTone}>{score >= 80 ? "Healthy" : score >= 60 ? "Moderate" : "Heavy"}</Badge>
            </div>
          </div>
        </div>
      </ThemeSectionCard>

      <ThemeSectionCard title="Recent changes" description="Draft vs published timeline.">
        <ul className="space-y-2 text-sm">
          <li>
            Draft updated:{" "}
            <strong data-hydration-probe="theme-draft-updated">
              {formatThemeTimestamp(draft?.updatedAt)}
            </strong>
          </li>
          <li>
            Published updated:{" "}
            <strong data-hydration-probe="theme-published-updated">
              {formatThemeTimestamp(published?.updatedAt)}
            </strong>
          </li>
          {draft && published && draft.updatedAt > published.updatedAt ? (
            <li className="text-amber-700">Unpublished draft changes are waiting to go live.</li>
          ) : (
            <li className="text-muted-foreground">Draft matches published timestamp or is in sync.</li>
          )}
        </ul>
      </ThemeSectionCard>

      <ThemeSectionCard title="Quick actions" searchTerms={["navigate", "jump", "section"]}>
        <div className="flex flex-wrap gap-2">
          {[
            ["presets", "Change preset"],
            ["colors", "Edit colors"],
            ["typography", "Fonts"],
            ["motion", "Motion"],
            ["effects", "Effects"],
            ["preview", "Open preview"],
          ].map(([id, label]) => (
            <Button key={id} type="button" variant="outline" size="sm" onClick={() => onNavigate(id)}>
              {label}
            </Button>
          ))}
        </div>
      </ThemeSectionCard>
    </div>
  );
}

function Stat({ label, value, probeKey }: { label: string; value: string; probeKey?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium" data-hydration-probe={probeKey}>
        {value}
      </p>
    </div>
  );
}

export function PresetsSection({
  studio,
  onApplyPresetAsDefault,
}: Pick<SectionProps, "studio"> & { onApplyPresetAsDefault?: (presetId: string) => Promise<void> }) {
  return (
    <PresetsManager
      siteDefaultPresetId={studio.state.siteDefaultPresetId}
      themeProvenance={studio.state.themeProvenance}
      onApplyPreset={studio.applyIndustryPreset}
      onApplyPresetAsDefault={onApplyPresetAsDefault}
      onDuplicatePreset={studio.duplicateIndustryPreset}
      onApplyPresetColors={studio.applyDuplicatedPresetColors}
      onApplyDefaultTheme={studio.resetIndustryPreset}
      onDuplicateDefaultTheme={studio.duplicateDefaultTheme}
      defaultThemeColors={studio.defaultThemeColors}
      exportJson={studio.exportThemeJson}
      onImportJson={studio.importThemeJson}
    />
  );
}

export function ColorsSection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState, applyPresetColors } = studio;
  return (
    <ThemeSectionCard title="Semantic colors" description="Primary palette tokens for the public site.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["CLASSIC", "MODERN", "LUXURY", "CUSTOM"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPresetColors(preset)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                state.preset === preset ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50"
              }`}
              data-theme-search={`${THEME_PRESET_LABELS[preset]} preset color`}
            >
              <span
                className="me-2 inline-block h-4 w-4 rounded-full align-middle"
                style={{ background: THEME_PRESET_DEFAULTS[preset].primaryColor }}
              />
              {THEME_PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ThemeColorPicker
            label="Primary"
            value={state.primaryColor}
            onChange={(primaryColor) => setState((s) => ({ ...s, primaryColor, preset: "CUSTOM" }))}
          />
          <ThemeColorPicker
            label="Secondary / accent"
            value={state.secondaryColor}
            onChange={(secondaryColor) => setState((s) => ({ ...s, secondaryColor, preset: "CUSTOM" }))}
          />
        </div>
      </div>
    </ThemeSectionCard>
  );
}

export function TypographySection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  const { locales } = useAdminEditingLocale();
  const fontOptions = GOOGLE_FONT_OPTIONS.map((f) => ({ value: f, label: f }));
  const globalFontOption = { value: "", label: "Use global" };
  const typography = state.typography;

  useTypographyFontLoader(typography);

  const getLocaleOverride = (locale: AdminLocale) => {
    const byPrefix = typography.localeFonts?.[locale.urlPrefix];
    const byCode = typography.localeFonts?.[locale.code];
    return byPrefix ?? byCode ?? {};
  };

  const updateLocaleFont = (
    locale: AdminLocale,
    field: "bodyFont" | "headingFont",
    value: string,
  ) => {
    const localeKey = locale.urlPrefix;
    setState((s) => {
      const current = { ...(s.typography.localeFonts ?? {}) };

      if (locale.code !== localeKey && current[locale.code]) {
        current[localeKey] = { ...current[localeKey], ...current[locale.code] };
        delete current[locale.code];
      }

      const entry = { ...(current[localeKey] ?? {}), htmlLang: locale.htmlLang };

      if (!value) {
        delete entry[field];
      } else {
        entry[field] = value;
      }

      if (!entry.bodyFont && !entry.headingFont) {
        delete current[localeKey];
      } else {
        current[localeKey] = entry;
      }

      const localeFonts = Object.keys(current).length > 0 ? current : undefined;
      return {
        ...s,
        typography: {
          ...s.typography,
          localeFonts,
        },
      };
    });
  };

  return (
    <ThemeSectionCard
      title="Typography"
      description="Global fonts and scale, with optional per-language overrides and live previews."
      searchTerms={["font", "locale", "language", "arabic", "rtl", "heading", "body"]}
    >
      <div className="space-y-8">
        <div>
          <h3 className="mb-3 text-sm font-medium">Global defaults</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <ThemeSelect
              label="Body font"
              value={typography.bodyFont}
              options={fontOptions}
              onChange={(bodyFont) =>
                setState((s) => ({ ...s, typography: { ...s.typography, bodyFont } }))
              }
            />
            <ThemeSelect
              label="Heading font"
              value={typography.headingFont}
              options={fontOptions}
              onChange={(headingFont) =>
                setState((s) => ({ ...s, typography: { ...s.typography, headingFont } }))
              }
            />
            <ThemeSelect
              label="Base font size"
              value={typography.baseFontSize}
              options={BASE_FONT_SIZE_OPTIONS.map((size) => ({ value: size, label: size }))}
              onChange={(baseFontSize) =>
                setState((s) => ({ ...s, typography: { ...s.typography, baseFontSize } }))
              }
            />
            <ThemeSlider
              label="Heading scale"
              value={typography.headingScale}
              min={1}
              max={1.5}
              step={0.05}
              formatValue={(v) => `${v}x`}
              onChange={(headingScale) =>
                setState((s) => ({ ...s, typography: { ...s.typography, headingScale } }))
              }
            />
          </div>
          <div className="mt-4">
            <LocaleFontPreview
              bodyFont={typography.bodyFont}
              headingFont={typography.headingFont}
              dir="ltr"
              localeCode="global"
              baseFontSize={typography.baseFontSize}
              headingScale={typography.headingScale}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="mb-1 text-sm font-medium">By language</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Override body or heading fonts per locale. Unset fields inherit the global defaults above.
          </p>
          <div className="space-y-4">
            {locales.map((locale) => {
              const override = getLocaleOverride(locale);
              const resolved = resolveLocaleFonts(typography, locale.urlPrefix, locale.code);
              return (
                <div key={locale.urlPrefix} className="rounded-lg border p-4">
                  <p
                    className="mb-3 text-sm font-medium"
                    data-hydration-probe={`theme-locale-font-${locale.urlPrefix}`}
                  >
                    {locale.flag ? `${locale.flag} ` : ""}
                    {locale.label}
                    <span className="ms-2 text-xs font-normal text-muted-foreground">
                      ({locale.urlPrefix}, {locale.htmlLang})
                    </span>
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ThemeSelect
                        label="Body font"
                        value={override.bodyFont ?? ""}
                        options={[globalFontOption, ...fontOptions]}
                        onChange={(bodyFont) => updateLocaleFont(locale, "bodyFont", bodyFont)}
                        searchTerms={[locale.label, locale.urlPrefix, "body"]}
                      />
                      <ThemeSelect
                        label="Heading font"
                        value={override.headingFont ?? ""}
                        options={[globalFontOption, ...fontOptions]}
                        onChange={(headingFont) =>
                          updateLocaleFont(locale, "headingFont", headingFont)
                        }
                        searchTerms={[locale.label, locale.urlPrefix, "heading"]}
                      />
                    </div>
                    <LocaleFontPreview
                      bodyFont={resolved.bodyFont}
                      headingFont={resolved.headingFont}
                      dir={locale.dir}
                      localeCode={locale.code}
                      baseFontSize={typography.baseFontSize}
                      headingScale={typography.headingScale}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ThemeSectionCard>
  );
}

export function LayoutSection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  return (
    <ThemeSectionCard title="Layout & spacing" description="Global density and loading behavior.">
      <div className="space-y-4">
        <ThemeSlider
          label="Spacing scale"
          value={state.spacingScale}
          min={0.8}
          max={1.5}
          step={0.05}
          formatValue={(v) => `${v}x`}
          onChange={(spacingScale) => setState((s) => ({ ...s, spacingScale }))}
          searchTerms={["layout", "density", "padding"]}
        />
        <ThemeToggle
          label="Lazy-load images"
          description="Defer off-screen images for faster first paint."
          checked={state.lazyLoadEnabled}
          onChange={(lazyLoadEnabled) => setState((s) => ({ ...s, lazyLoadEnabled }))}
        />
      </div>
    </ThemeSectionCard>
  );
}

export function MotionSection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  return (
    <ThemeSectionCard title="Motion" description="Animation speed and global motion policy.">
      <div className="space-y-4">
        <ThemeToggle
          label="Enable animations"
          checked={state.animationsEnabled}
          onChange={(animationsEnabled) => setState((s) => ({ ...s, animationsEnabled }))}
        />
        <ThemeSlider
          label="Animation speed"
          value={state.animationSpeed}
          min={0.5}
          max={2}
          step={0.1}
          formatValue={(v) => `${v}x`}
          onChange={(animationSpeed) => setState((s) => ({ ...s, animationSpeed }))}
        />
        <ThemeToggle
          label="Dark mode styling"
          description="Enables dark palette support; visitors can still toggle appearance."
          checked={state.darkModeEnabled}
          onChange={(darkModeEnabled) => setState((s) => ({ ...s, darkModeEnabled }))}
        />
      </div>
    </ThemeSectionCard>
  );
}

export function EffectsSection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  return (
    <div className="space-y-4">
      <CollapsibleSettingsGroup title="Master switches" defaultOpen>
        <EffectToggleGroup
          items={[
            {
              id: "cursor",
              label: "Cursor",
              checked: state.cursorEffectEnabled,
              onChange: (checked) => setState((s) => ({ ...s, cursorEffectEnabled: checked })),
            },
            {
              id: "background",
              label: "Background canvas",
              checked: state.backgroundEffectEnabled,
              onChange: (checked) => setState((s) => ({ ...s, backgroundEffectEnabled: checked })),
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
      <ThemeSectionCard title="Cursor" searchTerms={["effects", "pointer"]}>
        <EffectSelectField
          label="Cursor effect"
          value={state.cursorEffect ?? ""}
          options={CURSOR_EFFECT_OPTIONS}
          onChange={(cursorEffect) => setState((s) => ({ ...s, cursorEffect: cursorEffect || null }))}
        />
      </ThemeSectionCard>
      <ThemeSectionCard title="Text effects" searchTerms={["heading", "hero"]}>
        <EffectSelectField
          label="Text effect"
          value={state.textEffect ?? ""}
          options={TEXT_EFFECT_OPTIONS}
          onChange={(textEffect) => setState((s) => ({ ...s, textEffect: textEffect || null }))}
        />
      </ThemeSectionCard>
    </div>
  );
}

export function CardsBordersSection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  return (
    <ThemeSectionCard title="Cards & borders" description="Surface styling tokens applied globally.">
      <div className="grid gap-4 sm:grid-cols-2">
        <EffectSelectField
          label="Card style"
          value={state.cardStyle ?? ""}
          options={[...CARD_STYLE_OPTIONS]}
          onChange={(cardStyle) => setState((s) => ({ ...s, cardStyle: cardStyle || null }))}
        />
        <EffectSelectField
          label="Border style"
          value={state.borderStyle ?? ""}
          options={[...BORDER_STYLE_OPTIONS]}
          onChange={(borderStyle) => setState((s) => ({ ...s, borderStyle: borderStyle || null }))}
        />
      </div>
    </ThemeSectionCard>
  );
}

export function BackgroundsSection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  const hasBackground = Boolean(state.backgroundEffect && state.backgroundEffect !== "none");
  const settings = state.backgroundEffectSettings;

  return (
    <ThemeSectionCard title="Backgrounds" description="Site-wide canvas effects behind page content.">
      <EffectSelectField
        label="Background effect"
        value={state.backgroundEffect ?? ""}
        options={BACKGROUND_EFFECT_OPTIONS}
        onChange={(backgroundEffect) =>
          setState((s) => ({ ...s, backgroundEffect: backgroundEffect || null }))
        }
      />
      {hasBackground ? (
        <div className="mt-4 space-y-4 border-t pt-4">
          <ThemeSlider
            label="Intensity"
            value={settings.intensity}
            min={0.25}
            max={1.5}
            step={0.05}
            onChange={(intensity) =>
              setState((s) => ({
                ...s,
                backgroundEffectSettings: { ...s.backgroundEffectSettings, intensity },
              }))
            }
          />
          <ThemeSlider
            label="Opacity"
            value={settings.opacity}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(opacity) =>
              setState((s) => ({
                ...s,
                backgroundEffectSettings: { ...s.backgroundEffectSettings, opacity },
              }))
            }
          />
          <ThemeSlider
            label="Speed"
            value={settings.speed ?? state.animationSpeed}
            min={0.25}
            max={2}
            step={0.05}
            onChange={(speed) =>
              setState((s) => ({
                ...s,
                backgroundEffectSettings: { ...s.backgroundEffectSettings, speed },
              }))
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ThemeColorPicker
              label="Primary override"
              value={settings.colors?.primary ?? state.primaryColor}
              onChange={(primary) =>
                setState((s) => ({
                  ...s,
                  backgroundEffectSettings: {
                    ...s.backgroundEffectSettings,
                    colors: { ...s.backgroundEffectSettings.colors, primary },
                  },
                }))
              }
            />
            <ThemeColorPicker
              label="Accent override"
              value={settings.colors?.accent ?? state.secondaryColor}
              onChange={(accent) =>
                setState((s) => ({
                  ...s,
                  backgroundEffectSettings: {
                    ...s.backgroundEffectSettings,
                    colors: { ...s.backgroundEffectSettings.colors, accent },
                  },
                }))
              }
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setState((s) => ({
                ...s,
                backgroundEffectSettings: {
                  ...s.backgroundEffectSettings,
                  colors: undefined,
                },
              }))
            }
          >
            Reset color overrides
          </Button>
        </div>
      ) : null}
    </ThemeSectionCard>
  );
}

export function AccessibilitySection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  return (
    <div className="space-y-6">
      <ThemeSectionCard
        title="Accessibility"
        description="Defaults that respect visitor preferences. Maps to existing theme fields."
      >
        <div className="space-y-4">
          <ThemeToggle
            label="Respect reduced motion"
            description="When disabled, animations are off site-wide (maps to animations enabled)."
            checked={!state.animationsEnabled}
            onChange={(off) => setState((s) => ({ ...s, animationsEnabled: !off }))}
            searchTerms={["motion", "a11y"]}
          />
          <ThemeToggle
            label="Disable all effects"
            description="Turns off cursor, background, and text effects together."
            checked={
              !state.cursorEffectEnabled &&
              !state.backgroundEffectEnabled &&
              !state.textEffectEnabled
            }
            onChange={(off) =>
              setState((s) => ({
                ...s,
                cursorEffectEnabled: !off,
                backgroundEffectEnabled: !off,
                textEffectEnabled: !off,
              }))
            }
          />
          <ThemeSlider
            label="Font scaling"
            value={state.spacingScale}
            min={0.9}
            max={1.3}
            step={0.05}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(spacingScale) => setState((s) => ({ ...s, spacingScale }))}
            searchTerms={["font", "size", "readable"]}
          />
          <p className="text-xs text-muted-foreground">
            Contrast mode and focus ring strength will map to dedicated accessibility tokens in a
            later phase. Use Custom CSS for focus overrides today.
          </p>
        </div>
      </ThemeSectionCard>
    </div>
  );
}

export function CustomCssSection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  return (
    <ThemeSectionCard title="Custom CSS" description="Injected after theme variables on publish.">
      <Textarea
        rows={12}
        value={state.customCss ?? ""}
        onChange={(e) => setState((s) => ({ ...s, customCss: e.target.value || null }))}
        className="font-mono text-sm"
        placeholder=":root { } or .my-class { }"
        data-theme-search="custom css stylesheet"
      />
    </ThemeSectionCard>
  );
}

export function AdvancedSection({ studio }: Pick<SectionProps, "studio">) {
  const { state, setState } = studio;
  return (
    <Tabs defaultValue="identity" className="space-y-4">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg bg-muted/50 p-1">
        <TabsTrigger value="identity">Branding</TabsTrigger>
        <TabsTrigger value="assets">Assets</TabsTrigger>
        <TabsTrigger value="builders">Builders</TabsTrigger>
      </TabsList>

      <TabsContent value="identity" className="mt-0">
        <ThemeSectionCard
          title="Branding"
          description="Brand name, tagline, responsive logo behavior, and localized branding copy."
        >
          <SiteIdentityPanel
            brandConfig={state.brandConfig}
            onChange={(brandConfig) => setState((s) => ({ ...s, brandConfig }))}
          />
        </ThemeSectionCard>
      </TabsContent>

      <TabsContent value="assets" className="mt-0">
        <ThemeSectionCard title="Site assets" description="Theme-level logo and favicon used across the site.">
          <div className="space-y-6">
            <ThemeBrandUpload
              label="Website logo"
              value={state.logoUrl ?? ""}
              onChange={(url) => setState((s) => ({ ...s, logoUrl: url || null }))}
              previewSize={{ width: 160, height: 48 }}
            />
            <ThemeBrandUpload
              label="Favicon"
              hint="Square image recommended (32x32 or 64x64)."
              value={state.faviconUrl ?? ""}
              onChange={(url) => setState((s) => ({ ...s, faviconUrl: url || null }))}
            />
          </div>
        </ThemeSectionCard>
      </TabsContent>

      <TabsContent value="builders" className="mt-0">
        <ThemeSectionCard
          title="Header & footer builders"
          description="Open layout builders for navigation and footer structure."
        >
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/header">Open Header Builder</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/footer">Open Footer Builder</Link>
            </Button>
          </div>
        </ThemeSectionCard>
      </TabsContent>
    </Tabs>
  );
}

export function PreviewSection(props: SectionProps) {
  return (
    <ThemePreviewPanel
      tokens={props.studio.state}
      resolved={props.resolved}
      savedTokens={JSON.parse(props.studio.savedSnapshot) as ThemeTokens}
      compareMode={props.compareMode}
      onCompareModeChange={props.onCompareModeChange}
      previewAppearance={props.previewAppearance}
      onPreviewAppearanceChange={props.onPreviewAppearanceChange}
      fullPage
    />
  );
}
