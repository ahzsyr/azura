type Props = {
  lang: string;
  dir: "ltr" | "rtl";
};

/** Sets html lang/dir before hydration to avoid SSR/client mismatch on locale routes. */
export function DocumentLangScript({ lang, dir }: Props) {
  const langText = typeof lang === "string" ? lang : lang == null ? "en" : String(lang);
  const safeLang = langText.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeDir = dir === "rtl" ? "rtl" : "ltr";

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.documentElement.lang="${safeLang}";document.documentElement.dir="${safeDir}";`,
      }}
    />
  );
}
