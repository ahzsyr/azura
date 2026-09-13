"use client";

import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";

type LocaleFontPreviewProps = {
  bodyFont: string;
  headingFont: string;
  dir: "ltr" | "rtl";
  localeCode: string;
  baseFontSize: string;
  headingScale: number;
};

function getPreviewSample(localeCode: string, dir: "ltr" | "rtl") {
  if (dir === "rtl" || isArabicLocale(localeCode)) {
    return {
      heading: "عنوان تجريبي",
      body: "هذا نص تجريبي لمعاينة خط النص الأساسي في هذه اللغة.",
    };
  }
  return {
    heading: "Heading preview",
    body: "The quick brown fox jumps over the lazy dog.",
  };
}

export function LocaleFontPreview({
  bodyFont,
  headingFont,
  dir,
  localeCode,
  baseFontSize,
  headingScale,
}: LocaleFontPreviewProps) {
  const sample = getPreviewSample(localeCode, dir);
  const headingSize = `calc(${baseFontSize} * ${headingScale})`;

  return (
    <div
      className="rounded-md border bg-muted/30 p-4"
      dir={dir}
      data-theme-search="font preview sample"
    >
      <p className="mb-3 text-xs font-medium text-muted-foreground">Preview</p>
      <p
        className="font-semibold leading-tight"
        style={{
          fontFamily: `'${headingFont}', serif`,
          fontSize: headingSize,
        }}
      >
        {sample.heading}
      </p>
      <p
        className="mt-2 leading-relaxed text-muted-foreground"
        style={{
          fontFamily: `'${bodyFont}', sans-serif`,
          fontSize: baseFontSize,
        }}
      >
        {sample.body}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground/80">
        {headingFont} · {bodyFont}
      </p>
    </div>
  );
}
