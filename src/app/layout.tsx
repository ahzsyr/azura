import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import Script from "next/script";
import "@/app/globals.css";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { generateThemeBootInlineScript } from "@/lib/theme/theme-boot";
import { APPEARANCE_MODE_COOKIE } from "@/lib/theme/browser-chrome-projection";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { htmlAttributesToReactProps } from "@/lib/theme/theme-resolver";
import {
  SAFARI_CHROME_BOTTOM_ID,
  SAFARI_CHROME_TOP_ID,
} from "@/lib/theme/safari-chrome-tint";
import { ChunkLoadDiagnostics } from "@/components/debug/chunk-load-diagnostics";
import { SearchQueryShell } from "@/capabilities/search/query/search-query-shell";

type Props = {
  children: ReactNode;
};

function resolveDocumentLocale(pathname: string): {
  lang: string;
  dir: "ltr" | "rtl";
} {
  const segment = pathname.split("/").filter(Boolean)[0];
  const match = FALLBACK_LOCALES.find((locale) => locale.urlPrefix === segment);
  const locale = match ?? FALLBACK_LOCALES.find((entry) => entry.isDefault) ?? FALLBACK_LOCALES[0]!;
  return { lang: locale.htmlLang, dir: locale.dir };
}

function resolveAppearanceFromCookie(mode: string | undefined): {
  resolved: "light" | "dark";
  mode: string;
  className: string;
} {
  if (mode === "dark") {
    return { resolved: "dark", mode: "dark", className: "h-full dark" };
  }
  if (mode === "light") {
    return { resolved: "light", mode: "light", className: "h-full" };
  }
  return { resolved: "light", mode: mode ?? "system", className: "h-full" };
}

function mergeHtmlClasses(...parts: Array<string | undefined>): string {
  const tokens = new Set<string>();
  for (const part of parts) {
    for (const token of (part ?? "").split(/\s+/)) {
      if (token) tokens.add(token);
    }
  }
  return [...tokens].join(" ");
}

export default async function RootLayout({ children }: Props) {
  const bootScript = generateThemeBootInlineScript();
  const headerStore = await headers();
  const cookieStore = await cookies();
  const pathname = headerStore.get("x-pathname") ?? "/";
  const { lang, dir } = resolveDocumentLocale(pathname);
  const appearance = resolveAppearanceFromCookie(
    cookieStore.get(APPEARANCE_MODE_COOKIE)?.value,
  );

  let themeHtmlProps: Record<string, string> = {};
  let htmlClassName = appearance.className;
  if (!pathname.startsWith("/admin")) {
    try {
      const resolved = await resolvePublishedSiteTheme();
      themeHtmlProps = htmlAttributesToReactProps(resolved.htmlAttributes);
      delete themeHtmlProps.className;
      delete themeHtmlProps["data-theme"];
      delete themeHtmlProps["data-theme-mode"];

      const themeClass = resolved.htmlAttributes.class
        ?.split(/\s+/)
        .filter((token) => token !== "dark" && token !== "light")
        .join(" ");
      htmlClassName = mergeHtmlClasses(appearance.className, themeClass);
    } catch {
      // DB unavailable — appearance cookie attrs still apply.
    }
  }

  return (
    <html
      lang={lang}
      dir={dir}
      data-scroll-behavior="smooth"
      className={htmlClassName}
      data-theme={appearance.resolved}
      data-theme-mode={appearance.mode}
      {...themeHtmlProps}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <div
          id={SAFARI_CHROME_TOP_ID}
          aria-hidden="true"
          data-safari-chrome-tint="top"
          suppressHydrationWarning
        />
        <div
          id={SAFARI_CHROME_BOTTOM_ID}
          aria-hidden="true"
          data-safari-chrome-tint="bottom"
          suppressHydrationWarning
        />
        <Script
          id="az-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: bootScript }}
        />
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        {process.env.DEBUG_SESSION === "57e90f" ? <ChunkLoadDiagnostics /> : null}
        <SearchQueryShell>{children}</SearchQueryShell>
      </body>
    </html>
  );
}
