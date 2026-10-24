import { NextResponse } from "next/server";
import { CAPTCHA_SCOPES, type CaptchaPublicConfig } from "@/features/captcha/captcha.schema";

/**
 * Public captcha config for client-side widgets.
 *
 * Returns the site key (public by design) and, importantly, whether a captcha
 * will actually be enforced for a given scope. The browser must never decide
 * this on its own — that mismatch produced a form that demanded a captcha it
 * never rendered.
 *
 * Query: ?scope=register|login|passwordReset|forms|newsletter|inquiries
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const scopeParam = url.searchParams.get("scope") ?? "forms";
  const scope = (CAPTCHA_SCOPES as readonly string[]).includes(scopeParam)
    ? (scopeParam as (typeof CAPTCHA_SCOPES)[number])
    : "forms";

  try {
    const { resolveCaptchaFor } = await import("@/features/captcha/captcha.service");
    const requirement = await resolveCaptchaFor(scope);
    const body: CaptchaPublicConfig = {
      enabled: requirement.required,
      siteKey: requirement.widgetVisible ? requirement.siteKey : "",
      active: requirement.required && requirement.widgetVisible,
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Never break a page because captcha settings are unreadable.
    return NextResponse.json(
      { enabled: false, siteKey: "", active: false } satisfies CaptchaPublicConfig,
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
