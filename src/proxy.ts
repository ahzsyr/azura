import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { needsSupabaseSession } from "@/features/account/account-middleware";
import { rewriteBindHostLocation } from "@/lib/oauth-redirect-origin";
import { middlewareFallback, runMiddleware } from "@/middleware/pipeline";

function applyPublicRedirect(response: NextResponse): NextResponse {
  const location = response.headers.get("location");
  if (!location) return response;
  const rewritten = rewriteBindHostLocation(location);
  if (rewritten !== location) response.headers.set("location", rewritten);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const skipSupabase =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/auth") ||
    !needsSupabaseSession(pathname);

  let supabaseResponse: NextResponse | null = null;
  let supabaseModule: typeof import("@/utils/supabase/middleware") | null = null;
  if (!skipSupabase) {
    try {
      supabaseModule = await import("@/utils/supabase/middleware");
      if (supabaseModule.isSupabaseConfigured()) {
        supabaseResponse = await supabaseModule.updateSession(request);
      }
    } catch (error) {
      console.error("[middleware] supabase session skipped:", error);
    }
  }

  try {
    const response = await runMiddleware(request);
    const final = applyPublicRedirect(
      supabaseResponse && supabaseModule
        ? supabaseModule.mergeSupabaseCookies(supabaseResponse, response)
        : response,
    );
    final.headers.set("x-pathname", pathname);
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/_next")) {
      final.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
      final.headers.set("Pragma", "no-cache");
      final.headers.set("Expires", "0");
    }
    return final;
  } catch (error) {
    const fallback = applyPublicRedirect(middlewareFallback(request, error));
    fallback.headers.set("x-pathname", pathname);
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/_next")) {
      fallback.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
      fallback.headers.set("Pragma", "no-cache");
      fallback.headers.set("Expires", "0");
    }
    return fallback;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)"],
};
