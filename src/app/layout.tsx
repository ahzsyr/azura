import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Amiri } from "next/font/google";
import { ThemeInitInline } from "@/components/theme/theme-init-inline";
import "@/app/globals.css";
import "@/features/search/components/search-ui/search-ui.css";
import "@/features/search/components/search-ui/search-theme.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const headingFont = Amiri({
  subsets: ["latin", "arabic"],
  weight: ["400", "700"],
  variable: "--font-heading",
  display: "swap",
});

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${headingFont.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <ThemeInitInline />
        {children}
      </body>
    </html>
  );
}
