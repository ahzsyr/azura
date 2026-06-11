import { Amiri, Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

const amiri = Amiri({
  subsets: ["latin", "arabic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-amiri",
});

type FontEntry = {
  variable: string;
  cssFamily: string;
};

const FONT_MAP: Record<string, FontEntry> = {
  "Plus Jakarta Sans": {
    variable: plusJakartaSans.variable,
    cssFamily: "var(--font-plus-jakarta-sans)",
  },
  Amiri: {
    variable: amiri.variable,
    cssFamily: "var(--font-amiri)",
  },
};

export type ResolvedFonts = {
  classNames: string;
  cssOverride: string | null;
  needsExternalLink: boolean;
  bodyFont: string;
  headingFont: string;
};

export function resolveNextFonts(bodyFont: string, headingFont: string): ResolvedFonts {
  const body = FONT_MAP[bodyFont];
  const heading = FONT_MAP[headingFont];
  const needsExternalLink = !body || !heading;

  const variables = new Set<string>();
  if (body) variables.add(body.variable);
  if (heading) variables.add(heading.variable);

  let cssOverride: string | null = null;
  if (body && heading) {
    cssOverride = `:root{--az-font-body:${body.cssFamily},sans-serif;--az-font-display:${heading.cssFamily},serif;--font-body:${body.cssFamily},sans-serif;--font-display:${heading.cssFamily},serif;}`;
  } else if (body) {
    cssOverride = `:root{--az-font-body:${body.cssFamily},sans-serif;--font-body:${body.cssFamily},sans-serif;}`;
  } else if (heading) {
    cssOverride = `:root{--az-font-display:${heading.cssFamily},serif;--font-display:${heading.cssFamily},serif;}`;
  }

  return {
    classNames: Array.from(variables).join(" "),
    cssOverride,
    needsExternalLink,
    bodyFont,
    headingFont,
  };
}

export function buildGoogleFontsHref(bodyFont: string, headingFont: string): string {
  const body = bodyFont.replace(/ /g, "+");
  const heading = headingFont.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${body}:wght@400;500;600;700&family=${heading}:wght@400;700&display=swap`;
}
