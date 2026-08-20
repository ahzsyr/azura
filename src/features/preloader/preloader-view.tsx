"use client";

import { Loader2, Radio, Sparkles, Zap, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogoImage } from "@/features/navigation/components/header/brand-logo-image";
import { buildPreloaderStyle } from "@/lib/preloader/boot-preloader";
import type { PreloaderAnimation } from "@/features/preloader/site-preloader.schema";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";

export { buildPreloaderStyle };

const ICON_MAP: Record<string, LucideIcon> = {
  Loader2,
  Radio,
  Sparkles,
  Zap,
};

export function PreloaderCenterContent({
  settings,
  logoUrl,
}: {
  settings: ResolvedSitePreloader;
  logoUrl?: string | null;
}) {
  const resolvedLogo = logoUrl ?? settings.resolvedLogoUrl;

  switch (settings.centerType) {
    case "logo":
      if (resolvedLogo) {
        return (
          <div className="pre-svg" aria-hidden>
            <BrandLogoImage src={resolvedLogo} width={80} height={80} priority />
          </div>
        );
      }
      if (settings.centerText.trim()) {
        return <span className="pre-text">{settings.centerText}</span>;
      }
      {
        const Icon = ICON_MAP[settings.centerIcon] ?? Loader2;
        return (
          <span className="pre-icon" aria-hidden>
            <Icon size={48} strokeWidth={1.75} />
          </span>
        );
      }
    case "text":
      return <span className="pre-text">{settings.centerText.trim() || "Loading"}</span>;
    case "emoji":
      return <span className="pre-emoji">{settings.centerEmoji || "✨"}</span>;
    case "icon": {
      const Icon = ICON_MAP[settings.centerIcon] ?? Loader2;
      return (
        <span className="pre-icon" aria-hidden>
          <Icon size={48} strokeWidth={1.75} />
        </span>
      );
    }
    case "svg":
      if (settings.centerSvgUrl.trim()) {
        return (
          <div className="pre-svg" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.centerSvgUrl} alt="" />
          </div>
        );
      }
      return <span className="pre-emoji">✨</span>;
    default:
      return null;
  }
}

type PreloaderViewProps = {
  settings: ResolvedSitePreloader;
  variant?: "fullscreen" | "preview";
  hidden?: boolean;
  logoUrl?: string | null;
  className?: string;
  children?: ReactNode;
};

export function PreloaderView({
  settings,
  variant = "fullscreen",
  hidden = false,
  logoUrl,
  className = "",
}: PreloaderViewProps) {
  const animation = settings.animation as PreloaderAnimation;
  const variantClass =
    variant === "preview" ? "az-preloader--preview" : "az-preloader--fullscreen";

  return (
    <div
      className={`az-preloader ${variantClass} az-preloader--${animation}${hidden ? " hidden" : ""}${className ? ` ${className}` : ""}`}
      style={buildPreloaderStyle(settings)}
      role="status"
      aria-live="polite"
      aria-busy={!hidden}
      aria-label={settings.message.trim() || "Loading"}
    >
      <div className="pre-bg" aria-hidden />
      <div className="pre-stage">
        <div className="pre-center">
          <PreloaderCenterContent settings={settings} logoUrl={logoUrl} />
        </div>
        {settings.message.trim() ? <p className="pre-message">{settings.message}</p> : null}
      </div>
    </div>
  );
}
