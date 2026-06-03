"use client";

import { themeToCssVars } from "@/features/theme/theme-css";
import { THEME_PRESET_DEFAULTS } from "@/types/theme";
import type { ThemeTokens } from "@/types/theme";
import { DEFAULT_BRAND_NAME } from "@/config/site";
import { cn } from "@/lib/utils";
import { ThemeEffectsClient } from "@/components/theme/theme-effects-client";

type Props = {
  tokens: ThemeTokens;
  previewLocale: "en" | "ar";
  onLocaleChange: (locale: "en" | "ar") => void;
  compact?: boolean;
};

export function ThemePreviewPanel({ tokens, previewLocale, onLocaleChange, compact }: Props) {
  const css = themeToCssVars(tokens);
  const isRtl = previewLocale === "ar";
  const preset = THEME_PRESET_DEFAULTS[tokens.preset];
  const primary =
    tokens.preset === "CUSTOM" ? tokens.primaryColor : tokens.primaryColor || preset.primaryColor;
  const secondary =
    tokens.preset === "CUSTOM" ? tokens.secondaryColor : tokens.secondaryColor || preset.secondaryColor;
  const ctaLabel =
    previewLocale === "ar"
      ? tokens.headerConfig.ctaLabelAr || "استفسر"
      : tokens.headerConfig.ctaLabelEn || "Inquire";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <div className="flex rounded-md border p-0.5 text-xs">
          <button
            type="button"
            className={cn("rounded px-2 py-1", previewLocale === "en" && "bg-primary text-primary-foreground")}
            onClick={() => onLocaleChange("en")}
          >
            LTR
          </button>
          <button
            type="button"
            className={cn("rounded px-2 py-1", previewLocale === "ar" && "bg-primary text-primary-foreground")}
            onClick={() => onLocaleChange("ar")}
          >
            RTL
          </button>
        </div>
      </div>
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="rounded-xl border overflow-hidden bg-background shadow-sm"
        style={{ fontFamily: `var(--font-body)` }}
      >
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <ThemeEffectsClient tokens={tokens} />
        {!tokens.animationsEnabled && (
          <style>{`* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }`}</style>
        )}
        <header
          className={cn(
            "border-b px-4 py-3 flex items-center justify-between gap-2",
            tokens.headerConfig.sticky && "bg-background/95"
          )}
          style={{ borderColor: "var(--border, #e5e5e5)" }}
        >
          {tokens.headerConfig.showLogo ? (
            tokens.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tokens.logoUrl} alt="" className="h-8 max-w-[120px] object-contain" />
            ) : (
              <span className="font-bold text-sm" style={{ color: primary, fontFamily: "var(--font-heading)" }}>
                {DEFAULT_BRAND_NAME}
              </span>
            )
          ) : (
            <span className="text-xs text-muted-foreground">Logo hidden</span>
          )}
          {tokens.headerConfig.showNav && (
            <nav className="hidden sm:flex gap-2 text-[10px] text-muted-foreground">
              <span>{isRtl ? "الرئيسية" : "Home"}</span>
              <span>{isRtl ? "الباقات" : "Packages"}</span>
            </nav>
          )}
          {tokens.headerConfig.showCta && (
            <span
              className="text-[10px] px-2 py-1 rounded-md text-white shrink-0"
              style={{ background: secondary }}
            >
              {ctaLabel}
            </span>
          )}
        </header>
        <div className="p-4 space-y-3">
          <div
            className="rounded-lg p-4 text-white text-sm"
            style={{
              background: `linear-gradient(135deg, ${primary} 0%, #0a0a0a 100%)`,
            }}
          >
            <p
              className="font-semibold"
              data-text-effect={tokens.textEffect ?? undefined}
              style={{ fontFamily: "var(--font-heading)", fontSize: `calc(var(--font-size-base) * var(--heading-scale))` }}
            >
              {isRtl ? "عمرة فاخرة" : "Premium Umrah"}
            </p>
            <p className="text-xs opacity-90 mt-1">
              {previewLocale === "ar"
                ? tokens.footerConfig.taglineAr || "سفير المدينة — سفر إسلامي موثوق"
                : tokens.footerConfig.taglineEn || "Trusted Islamic travel companion"}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="h-8 flex-1 rounded" style={{ background: primary, opacity: 0.2 }} />
            <div className="h-8 w-16 rounded" style={{ background: secondary }} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Preset: {tokens.preset} · Speed: {tokens.animationSpeed}x · Spacing: {tokens.spacingScale}x
            {tokens.darkModeEnabled ? " · Dark mode" : ""}
          </p>
        </div>
        <footer
          className="border-t px-4 py-3 text-[10px]"
          style={{ background: "#0a0a0a", color: "#fafafa" }}
        >
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${tokens.footerConfig.columns}, minmax(0, 1fr))` }}
          >
            {tokens.footerConfig.showQuickLinks && <span>{isRtl ? "روابط" : "Links"}</span>}
            {tokens.footerConfig.showContact && <span>{isRtl ? "اتصل" : "Contact"}</span>}
            {tokens.footerConfig.showSocial && <span>{isRtl ? "تواصل" : "Social"}</span>}
          </div>
        </footer>
      </div>
      {!compact ? (
        <p className="text-xs text-muted-foreground">
          Changes reflect here instantly. Save draft, then open the site in a new tab to preview on real pages.
        </p>
      ) : null}
    </div>
  );
}
