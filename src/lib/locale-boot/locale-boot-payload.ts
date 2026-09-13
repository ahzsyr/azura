import {
  pageTransitionCssVars,
  pageTransitionDataAttributes,
} from "@/lib/navigation/page-transitions";
import type { ResolvedPageTransitions } from "@/features/preloader/resolve-page-transitions";

export type LocaleBootPayload = {
  lang: string;
  dir: "ltr" | "rtl";
  locale: string;
  htmlAttributes: Record<string, string>;
  cursorEffect: string | null;
  primary: string | null;
  accent: string | null;
  pageTransition: {
    attrs: Record<string, string>;
    vars: Record<string, string>;
  };
  preloaderActive: boolean;
  preloaderMaxMs: number;
};

function cssColorForBoot(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /[<>{};]/.test(trimmed)) return null;
  return trimmed;
}

export function buildLocaleBootPayload(input: {
  lang: string;
  dir: "ltr" | "rtl";
  locale: string;
  htmlAttributes: Record<string, string>;
  cursorEffect?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  pageTransitionSettings: ResolvedPageTransitions;
  preloaderActive: boolean;
  preloaderMaxMs: number;
}): LocaleBootPayload {
  const attrs = pageTransitionDataAttributes(
    input.pageTransitionSettings.enabled,
    input.pageTransitionSettings.preset,
    input.pageTransitionSettings.durationMs,
    input.pageTransitionSettings.sharedElementsEnabled !== false,
  );
  const vars = pageTransitionCssVars(input.pageTransitionSettings.durationMs);

  return {
    lang: input.lang,
    dir: input.dir,
    locale: input.locale,
    htmlAttributes: input.htmlAttributes,
    cursorEffect: input.cursorEffect ?? null,
    primary: cssColorForBoot(input.primaryColor),
    accent: cssColorForBoot(input.accentColor),
    pageTransition: { attrs, vars },
    preloaderActive: input.preloaderActive,
    preloaderMaxMs: input.preloaderMaxMs,
  };
}

/** Safe JSON for embedding in a non-executing script tag. */
export function serializeLocaleBootPayload(payload: LocaleBootPayload): string {
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
