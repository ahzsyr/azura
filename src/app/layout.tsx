import type { ReactNode } from "react";
import Script from "next/script";
import "@/app/globals.css";
import { loadThemeSsrPayload } from "@/lib/theme/theme-ssr";
import { htmlAttributesToReactProps } from "@/lib/theme/theme-resolver";

type Props = {
  children: ReactNode;
};

export default async function RootLayout({ children }: Props) {
  const { htmlAttributes, bootScript } = await loadThemeSsrPayload();
  const { className: themeClassName, ...restHtmlAttributes } =
    htmlAttributesToReactProps(htmlAttributes);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={["h-full", themeClassName].filter(Boolean).join(" ")}
      suppressHydrationWarning
      {...restHtmlAttributes}
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <Script
          id="az-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: bootScript }}
        />
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
