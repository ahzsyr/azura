import { buildPreloaderBootScript } from "@/lib/preloader/boot-preloader";

type Props = {
  active: boolean;
  /** Hard cap (ms) — removes site-preloading if client preloader never mounts. */
  maxDurationMs?: number;
};

export function PreloaderBootScript({ active, maxDurationMs = 12000 }: Props) {
  if (!active) return null;

  const debug = process.env.NODE_ENV === "development";

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: buildPreloaderBootScript(maxDurationMs, debug),
      }}
    />
  );
}
