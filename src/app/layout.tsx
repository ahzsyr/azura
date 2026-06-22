import type { ReactNode } from "react";
import Script from "next/script";
import "@/app/globals.css";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { generateThemeBootInlineScript } from "@/lib/theme/theme-boot";

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
        {children}
        {process.env.NEXT_PUBLIC_GA_ID ? (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        ) : null}
      </body>
    </html>
  );
}
