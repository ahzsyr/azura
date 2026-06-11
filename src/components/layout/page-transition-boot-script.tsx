import type { ResolvedPageTransitions } from "@/features/preloader/resolve-page-transitions";
import {
  pageTransitionCssVars,
  pageTransitionDataAttributes,
} from "@/lib/navigation/page-transitions";

type Props = {
  settings: ResolvedPageTransitions;
};

/** Inline boot — applies page transition preset before first paint. */
export function PageTransitionBootScript({ settings }: Props) {
  const attrs = pageTransitionDataAttributes(
    settings.enabled,
    settings.preset,
    settings.durationMs,
    settings.sharedElementsEnabled !== false,
  );
  const vars = pageTransitionCssVars(settings.durationMs);

  const attrLines = Object.entries(attrs)
    .map(([k, v]) => `document.documentElement.setAttribute("${k}","${v}");`)
    .join("");

  const varLines = Object.entries(vars)
    .map(([k, v]) => `document.documentElement.style.setProperty("${k}","${v}");`)
    .join("");

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{${attrLines}${varLines}}catch(e){}})();`,
      }}
    />
  );
}
