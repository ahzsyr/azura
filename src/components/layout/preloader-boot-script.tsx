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
        __html: `(function(){var reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(reduced){document.dispatchEvent(new CustomEvent("azura:shell-ready"));return;}document.documentElement.classList.add("site-preloading");var cleared=false;var clear=function(){if(cleared)return;cleared=true;document.documentElement.classList.remove("site-preloading");document.dispatchEvent(new CustomEvent("azura:shell-ready"));};document.addEventListener("azura:route-content-ready",clear,{once:true});setTimeout(clear,${maxDurationMs});})();`,
      }}
    />
  );
}
