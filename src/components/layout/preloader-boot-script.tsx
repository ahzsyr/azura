type Props = {
  active: boolean;
  /** Hard cap (ms) — removes site-preloading if client preloader never mounts. */
  maxDurationMs?: number;
};

export function PreloaderBootScript({ active, maxDurationMs = 12000 }: Props) {
  if (!active) return null;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){document.documentElement.classList.add('site-preloading');setTimeout(function(){document.documentElement.classList.remove('site-preloading');},${maxDurationMs});})();`,
      }}
    />
  );
}
