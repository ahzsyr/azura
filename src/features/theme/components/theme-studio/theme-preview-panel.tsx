"use client";

import { useMemo, useState } from "react";
import { Monitor, Moon, Smartphone, Sun, Tablet } from "lucide-react";
import { ThemeEffectsClient } from "@/components/theme/theme-effects-client";
import { DEFAULT_BRAND_NAME } from "@/config/site";
import { cn } from "@/lib/utils";
import type { ResolvedTheme } from "@/lib/theme/theme-resolver";
import type { ThemeTokens } from "@/types/theme";
import { ThemeToggle } from "./controls";

type Viewport = "desktop" | "tablet" | "mobile";

type Props = {
  tokens: ThemeTokens;
  resolved: ResolvedTheme;
  savedTokens: ThemeTokens;
  previewLocale: "en" | "ar";
  onLocaleChange: (locale: "en" | "ar") => void;
  compareMode: boolean;
  onCompareModeChange: (value: boolean) => void;
  previewAppearance: "light" | "dark";
  onPreviewAppearanceChange: (value: "light" | "dark") => void;
  compact?: boolean;
  fullPage?: boolean;
  viewport?: Viewport;
  onViewportChange?: (viewport: Viewport) => void;
};

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

function PreviewChrome({
  tokens,
  resolved,
  previewLocale,
  previewAppearance,
  isRtl,
}: {
  tokens: ThemeTokens;
  resolved: ResolvedTheme;
  previewLocale: "en" | "ar";
  previewAppearance: "light" | "dark";
  isRtl: boolean;
}) {
  const primary = tokens.primaryColor;
  const secondary = tokens.secondaryColor;
  const ctaLabel =
    previewLocale === "ar"
      ? tokens.headerConfig.ctaLabelAr || "استفسر"
      : tokens.headerConfig.ctaLabelEn || "Inquire";

  const themeCss = resolved.css.theme;
  const presetCss = resolved.css.presetVisual;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-sm",
        previewAppearance === "dark" && "dark",
      )}
      style={{ fontFamily: "var(--font-body)" }}
      data-theme={previewAppearance}
      data-card-style={resolved.cardStyle ?? undefined}
      data-border-style={resolved.borderStyle ?? undefined}
      data-preset-id={resolved.preset.presetId ?? undefined}
      data-motion={resolved.motion.level}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${themeCss}\n${presetCss}`,
        }}
      />
      <ThemeEffectsClient tokens={tokens} />
      {!tokens.animationsEnabled ? (
        <style>{`*{animation-duration:0.01ms!important;transition-duration:0.01ms!important}`}</style>
      ) : null}
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        {tokens.headerConfig.showLogo ? (
          tokens.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tokens.logoUrl} alt="" className="h-8 max-w-[120px] object-contain" />
          ) : (
            <span className="text-sm font-bold" style={{ color: primary, fontFamily: "var(--font-heading)" }}>
              {DEFAULT_BRAND_NAME}
            </span>
          )
        ) : (
          <span className="text-xs text-muted-foreground">Logo hidden</span>
        )}
        {tokens.headerConfig.showNav ? (
          <nav className="hidden gap-2 text-[10px] text-muted-foreground sm:flex">
            <span>{isRtl ? "الرئيسية" : "Home"}</span>
            <span>{isRtl ? "الباقات" : "Packages"}</span>
          </nav>
        ) : null}
        {tokens.headerConfig.showCta ? (
          <span className="shrink-0 rounded-md px-2 py-1 text-[10px] text-white" style={{ background: secondary }}>
            {ctaLabel}
          </span>
        ) : null}
      </header>
      <div className="space-y-3 p-4">
        <div
          className="rounded-lg p-4 text-sm text-white"
          style={{ background: `linear-gradient(135deg, ${primary} 0%, #0a0a0a 100%)` }}
        >
          <p
            className="font-semibold"
            data-text-effect={tokens.textEffect ?? undefined}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "calc(var(--font-size-base) * var(--heading-scale))",
            }}
          >
            {isRtl ? "عمرة فاخرة" : "Premium Umrah"}
          </p>
          <p className="mt-1 text-xs opacity-90">
            {previewLocale === "ar"
              ? tokens.footerConfig.taglineAr || "سفير المدينة — سفر إسلامي موثوق"
              : tokens.footerConfig.taglineEn || "Trusted Islamic travel companion"}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="az-card az-glass-shimmer relative h-8 flex-1 rounded-lg opacity-90" />
          <div className="h-8 w-16 rounded-lg" style={{ background: secondary }} />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {resolved.preset.presetId ?? tokens.preset} · {resolved.motion.level} motion ·{" "}
          {tokens.spacingScale}x spacing
        </p>
      </div>
      <footer className="border-t px-4 py-3 text-[10px]" style={{ background: "#0a0a0a", color: "#fafafa" }}>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${tokens.footerConfig.columns}, minmax(0, 1fr))` }}
        >
          {tokens.footerConfig.showQuickLinks ? <span>{isRtl ? "روابط" : "Links"}</span> : null}
          {tokens.footerConfig.showContact ? <span>{isRtl ? "اتصل" : "Contact"}</span> : null}
          {tokens.footerConfig.showSocial ? <span>{isRtl ? "تواصل" : "Social"}</span> : null}
        </div>
      </footer>
    </div>
  );
}

export function ThemePreviewPanel({
  tokens,
  resolved,
  savedTokens,
  previewLocale,
  onLocaleChange,
  compareMode,
  onCompareModeChange,
  previewAppearance,
  onPreviewAppearanceChange,
  compact,
  fullPage,
  viewport: controlledViewport,
  onViewportChange,
}: Props) {
  const [internalViewport, setInternalViewport] = useState<Viewport>("desktop");
  const viewport = controlledViewport ?? internalViewport;
  const setViewport = onViewportChange ?? setInternalViewport;

  const savedResolved = useMemo(
    () => resolveThemeForPreview(savedTokens),
    [savedTokens],
  );

  const isRtl = previewLocale === "ar";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border p-0.5 text-xs">
          <ViewportButton active={viewport === "desktop"} onClick={() => setViewport("desktop")} icon={Monitor} label="Desktop" />
          <ViewportButton active={viewport === "tablet"} onClick={() => setViewport("tablet")} icon={Tablet} label="Tablet" />
          <ViewportButton active={viewport === "mobile"} onClick={() => setViewport("mobile")} icon={Smartphone} label="Mobile" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border p-0.5 text-xs">
            <button
              type="button"
              className={cn("rounded px-2 py-1", previewAppearance === "light" && "bg-primary text-primary-foreground")}
              onClick={() => onPreviewAppearanceChange("light")}
            >
              <Sun className="me-1 inline size-3" />
              Light
            </button>
            <button
              type="button"
              className={cn("rounded px-2 py-1", previewAppearance === "dark" && "bg-primary text-primary-foreground")}
              onClick={() => onPreviewAppearanceChange("dark")}
            >
              <Moon className="me-1 inline size-3" />
              Dark
            </button>
          </div>
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
          <ThemeToggle
            label="Compare saved"
            checked={compareMode}
            onChange={onCompareModeChange}
            className="rounded-md border px-3 py-2"
          />
        </div>
      </div>

      <div className={cn("mx-auto w-full transition-all", fullPage ? "max-w-none" : "max-w-4xl")}>
        <div
          className="mx-auto transition-all"
          style={{ width: VIEWPORT_WIDTH[viewport], maxWidth: "100%" }}
        >
          {compareMode ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Saved</p>
                <PreviewChrome
                  tokens={savedTokens}
                  resolved={savedResolved}
                  previewLocale={previewLocale}
                  previewAppearance={previewAppearance}
                  isRtl={isRtl}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Current (unsaved)</p>
                <PreviewChrome
                  tokens={tokens}
                  resolved={resolved}
                  previewLocale={previewLocale}
                  previewAppearance={previewAppearance}
                  isRtl={isRtl}
                />
              </div>
            </div>
          ) : (
            <PreviewChrome
              tokens={tokens}
              resolved={resolved}
              previewLocale={previewLocale}
              previewAppearance={previewAppearance}
              isRtl={isRtl}
            />
          )}
        </div>
      </div>

      {!compact ? (
        <p className="text-xs text-muted-foreground">
          Preview updates instantly from the editor. Save draft, then use Preview in the top bar to
          open the live site.
        </p>
      ) : null}
    </div>
  );
}

function ViewportButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Monitor;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn("flex items-center gap-1 rounded px-2 py-1", active && "bg-primary text-primary-foreground")}
      onClick={onClick}
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}

import { resolveThemeForPreview } from "./resolve-theme-client";
