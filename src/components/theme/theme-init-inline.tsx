import Script from "next/script";

/**
 * Blocking theme bootstrap before hydration.
 * Source of truth: `/public/theme-init.js`
 */
export function ThemeInitInline() {
  return (
    <Script
      id="theme-init"
      src="/theme-init.js"
      strategy="beforeInteractive"
    />
  );
}
