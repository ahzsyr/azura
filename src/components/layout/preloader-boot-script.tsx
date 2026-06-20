import {
  buildBootPreloaderInnerHtml,
  buildPreloaderBootScript,
  buildPreloaderStyle,
} from "@/lib/preloader/boot-preloader";
import type { ResolvedSitePreloader } from "@/features/preloader/resolve-site-preloader";

type Props = {
  active: boolean;
  settings: ResolvedSitePreloader;
  logoUrl?: string | null;
  /** Hard cap (ms) — removes site-preloading if client preloader never mounts. */
  maxDurationMs?: number;
};

export function PreloaderBootScript({
  active,
  settings,
  logoUrl,
  maxDurationMs = 12000,
}: Props) {
  if (!active) return null;

  const debug = process.env.NODE_ENV === "development";
  const innerHtml = buildBootPreloaderInnerHtml(settings, logoUrl);
  const ariaLabel = settings.message.trim() || "Loading";

  return (
    <>
      <div
        id="azura-boot-preloader"
        className={`az-preloader az-preloader--fullscreen az-preloader--${settings.animation}`}
        style={buildPreloaderStyle(settings)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={ariaLabel}
        dangerouslySetInnerHTML={{ __html: innerHtml }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: buildPreloaderBootScript(settings, maxDurationMs, debug, logoUrl),
        }}
      />
    </>
  );
}
