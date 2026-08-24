import type { ReactNode } from "react";
import Script from "next/script";
import "@/app/globals.css";
import { generateThemeBootInlineScript } from "@/lib/theme/theme-boot";
import { ChunkLoadDiagnostics } from "@/components/debug/chunk-load-diagnostics";
import { SearchQueryShell } from "@/capabilities/search/query/search-query-shell";

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  const bootScript = generateThemeBootInlineScript();

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full"
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
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
