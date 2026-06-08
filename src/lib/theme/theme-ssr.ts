import { headers } from "next/headers";
import { htmlAttributesToReactProps } from "./theme-resolver";
import { resolvePublishedSiteTheme } from "./resolve-site-theme.server";
import { generateThemeBootInlineScript } from "./theme-boot";
import type { ResolvedTheme } from "./theme-resolver";

export type ThemeSsrPayload = {
  htmlAttributes: Record<string, string>;
  bootScript: string;
  resolved: ResolvedTheme | null;
};

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

/** Load published site theme and SSR document hooks (skipped on admin routes). */
export async function loadThemeSsrPayload(): Promise<ThemeSsrPayload> {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const bootScript = generateThemeBootInlineScript();

  if (isAdminPath(pathname)) {
    return {
      htmlAttributes: {},
      bootScript,
      resolved: null,
    };
  }

  try {
    const resolved = await resolvePublishedSiteTheme();

    return {
      htmlAttributes: htmlAttributesToReactProps(resolved.htmlAttributes),
      bootScript,
      resolved,
    };
  } catch (error) {
    console.error("[theme-ssr] failed to resolve site theme:", error);
    return {
      htmlAttributes: {},
      bootScript,
      resolved: null,
    };
  }
}
