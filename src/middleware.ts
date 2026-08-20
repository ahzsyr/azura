import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { needsSupabaseSession } from "@/features/account/account-middleware";
import { middlewareFallback, runMiddleware } from "@/middleware/pipeline";

export default async function middleware(request: NextRequest) {
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
    const final = supabaseResponse && supabaseModule
      ? supabaseModule.mergeSupabaseCookies(supabaseResponse, response)
      : response;
    final.headers.set("x-pathname", pathname);
    return final;
  } catch (error) {
    const fallback = middlewareFallback(request, error);
    fallback.headers.set("x-pathname", pathname);
    return fallback;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)"],
};
