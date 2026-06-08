import type { ReactNode } from "react";
import Script from "next/script";
import "@/app/globals.css";
import "@/features/search/components/search-ui/search-ui.css";
import "@/features/search/components/search-ui/search-theme.css";
import { loadThemeSsrPayload } from "@/lib/theme/theme-ssr";

type Props = {
  children: ReactNode;
};

export default async function RootLayout({ children }: Props) {
  const { htmlAttributes, bootScript } = await loadThemeSsrPayload();

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full"
      suppressHydrationWarning
      {...htmlAttributes}
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
