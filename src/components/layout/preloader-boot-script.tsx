import { buildPreloaderBootScript } from "@/lib/preloader/boot-preloader";
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

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: buildPreloaderBootScript(settings, maxDurationMs, debug, logoUrl),
      }}
    />
  );
}
