import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminPathDisabled } from "@/config/deployment-profile";
import { profileDisabledResponse } from "@/middleware/profile-gate";
import { getAuthToken, isAdminToken } from "@/lib/auth.middleware";

/** Skip setup/locale probes — admin uses JWT auth, not Supabase. */
export async function handleAdminFastPath(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return null;
  if (pathname === "/admin/login") return NextResponse.next();

  try {
    const token = await getAuthToken(request);
    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdminToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (isAdminPathDisabled(pathname)) {
      return profileDisabledResponse();
    }
    return NextResponse.next();
  } catch (error) {
    console.error("[middleware] admin auth check failed:", error);
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}
