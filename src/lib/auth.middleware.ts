import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { getAuthSecretForMiddleware } from "@/lib/auth-secret.edge";

/** Auth.js v5 session cookie — must match sign-in cookie name and salt. */
function resolveSessionCookieName(): string {
  const authUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").trim();
  const useSecure =
    authUrl.startsWith("https://") || process.env.NODE_ENV === "production";
  return useSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export async function getAuthToken(request: NextRequest) {
  const authSecret = getAuthSecretForMiddleware();
  if (!authSecret) return null;

  const cookieName = resolveSessionCookieName();

  try {
    const token = await getToken({
      req: request,
      secret: authSecret,
      cookieName,
      salt: cookieName,
      secureCookie: cookieName.startsWith("__Secure-"),
    });
    if (token) return token;

    // Fallback for mismatched env (e.g. http localhost with production NODE_ENV).
    const altName =
      cookieName === "authjs.session-token"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token";
    return await getToken({
      req: request,
      secret: authSecret,
      cookieName: altName,
      salt: altName,
      secureCookie: altName.startsWith("__Secure-"),
    });
  } catch {
    return null;
  }
}

export function isAdminToken(
  token: Awaited<ReturnType<typeof getAuthToken>>,
): boolean {
  return String(token?.role ?? "").toUpperCase() === "ADMIN";
}

export function tokenToSession(
  token: Awaited<ReturnType<typeof getAuthToken>>,
): Session | null {
  if (!token?.id && !token?.email) return null;
  return {
    user: {
      id: String(token.id ?? ""),
      role: String(token.role ?? ""),
      email: token.email ?? undefined,
      name: token.name ?? undefined,
      image: token.picture ?? undefined,
    },
    expires: token.exp ? new Date(token.exp * 1000).toISOString() : new Date().toISOString(),
  };
}
