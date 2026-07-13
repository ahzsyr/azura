type Props = {
  lang: string;
  dir: "ltr" | "rtl";
  locale?: string;
};

/** Sets html lang/dir/locale before hydration to avoid SSR/client mismatch on locale routes. */
export function DocumentLangScript({ lang, dir, locale }: Props) {
  const langText = typeof lang === "string" ? lang : lang == null ? "en" : String(lang);
  const safeLang = langText.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeDir = dir === "rtl" ? "rtl" : "ltr";
  const safeLocale =
    typeof locale === "string" ? locale.replace(/\\/g, "\\\\").replace(/"/g, '\\"') : "";

  const localeScript = safeLocale
    ? `document.documentElement.setAttribute("data-locale","${safeLocale}");`
    : `document.documentElement.removeAttribute("data-locale");`;

  const inlineScript = `document.documentElement.lang="${safeLang}";document.documentElement.dir="${safeDir}";${localeScript}`;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: inlineScript,
      }}
    />
  );
}
