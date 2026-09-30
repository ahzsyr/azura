/**
 * Single source of truth for portal routing after authentication.
 * Callers must not invent redirect targets; use these helpers only.
 */

import { routing } from "@/i18n/routing";
import { publicLocalePath } from "@/i18n/url-helpers";

const PUBLIC_AUTH_SUBPATHS = new Set([
  "login",
  "register",
  "forgot-password",
  "reset-password",
]);

/** Returns true only for ADMIN and SUPER_ADMIN; canonical portal-level admin predicate. */
export function isAdminRole(role: string | null | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

/** Canonical customer predicate (boolean); currently true only for CUSTOMER. */
export function isCustomerRole(role: string | null | undefined): boolean {
  return String(role ?? "").toUpperCase() === "CUSTOMER";
}

/**
 * Decode / normalize / validate an internal same-origin path.
 * Returns null when the value is unsafe or not an internal path.
 * Does not rewrite legitimate `/admin/...` application routes.
 */
export function sanitizeInternalPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Reject schemes, protocol-relative, backslash tricks before decode
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.includes("\\")) {
    return null;
  }
  if (!trimmed.startsWith("/")) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }

  // Re-check after decode (e.g. /%2F%2Fevil.com → //evil.com)
  if (decoded.startsWith("//") || decoded.startsWith("/\\") || decoded.includes("\\")) {
    return null;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) return null;
  if (!decoded.startsWith("/")) return null;

  // Reject remaining encoded structure-changing sequences
  if (/%2f/i.test(decoded) || /%2e/i.test(decoded)) return null;

  // Split and reject `.` / `..` / empty segments (except leading slash)
  const segments = decoded.split("/");
  // First element is empty because path starts with /
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]!;
    // Allow trailing empty only for root-style paths we won't keep as trailing slash
    if (i === segments.length - 1 && seg === "") continue;
    if (seg === "" || seg === "." || seg === "..") return null;
  }

  // Normalize: drop trailing slash (except root)
  let path = decoded.replace(/\/+$/, "") || "/";
  if (path !== "/" && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  // Collapse accidental double slashes that slipped through (should already be rejected)
  if (path.includes("//")) return null;

  return path;
}

/** Canonical admin destination: /admin or /admin/* except never used alone for “is admin route”. */
export function isCanonicalAdminPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

/** Map /{locale}/admin/... → /admin/... ; returns null if not a locale-prefixed admin lookalike. */
export function remapLocalePrefixedAdmin(path: string): string | null {
  const match = path.match(/^\/([^/]+)\/admin(\/.*)?$/);
  if (!match) return null;
  const rest = match[2] ?? "";
  return `/admin${rest}` || "/admin";
}

function isPublicAuthPath(path: string): boolean {
  const unprefixed = path.match(/^\/account\/([^/]+)\/?$/);
  if (unprefixed && PUBLIC_AUTH_SUBPATHS.has(unprefixed[1]!)) return true;

  const match = path.match(/^\/([^/]+)\/account\/([^/]+)\/?$/);
  if (!match) return false;
  return PUBLIC_AUTH_SUBPATHS.has(match[2]!);
}

function isForbiddenFinalDestination(path: string): boolean {
  if (path === "/admin/login") return true;
  if (isPublicAuthPath(path)) return true;
  return false;
}

function roleDefault(role: string | null | undefined, locale: string): string {
  const loc = locale.trim() || routing.defaultLocale;
  if (isAdminRole(role)) return "/admin";
  return publicLocalePath(loc, "/account");
}

/**
 * Unauthenticated users who need to sign in.
 * Omits callback query when empty/unsafe or when callback would be a login surface.
 */
export function resolveLoginEntryPath(input: {
  locale: string;
  callbackUrl?: string | null;
}): string {
  const locale = input.locale.trim() || routing.defaultLocale;
  const base = publicLocalePath(locale, "/account/login");
  const sanitized = sanitizeInternalPath(input.callbackUrl);
  if (!sanitized) return base;
  if (isForbiddenFinalDestination(sanitized)) return base;

  // Preserve admin (and other) destinations through the login round trip
  const params = new URLSearchParams();
  params.set("callbackUrl", sanitized);
  return `${base}?${params.toString()}`;
}

/**
 * The only authenticated post-login destination function.
 * callbackUrl is a requested destination; role is the authorization boundary.
 */
export function resolvePostLoginRedirect(input: {
  role: string | null | undefined;
  locale: string;
  callbackUrl?: string | null;
}): string {
  const locale = input.locale.trim() || routing.defaultLocale;
  const fallback = roleDefault(input.role, locale);
  const sanitized = sanitizeInternalPath(input.callbackUrl);
  if (!sanitized) return fallback;
  if (isForbiddenFinalDestination(sanitized)) return fallback;

  // Locale-prefixed admin lookalike: /ar/admin/products
  const remapped = remapLocalePrefixedAdmin(sanitized);
  if (remapped) {
    if (!isAdminRole(input.role)) return fallback;
    if (isForbiddenFinalDestination(remapped)) return fallback;
    return remapped;
  }

  if (isCanonicalAdminPath(sanitized)) {
    if (!isAdminRole(input.role)) return fallback;
    return sanitized;
  }

  // Non-admin path
  if (isAdminRole(input.role)) {
    // Admins are always sent to the admin portal (account paths are not admin destinations)
    return fallback;
  }

  // Customer: allow sanitized non-admin internal path
  return sanitized;
}

/** Resolve locale for login entry: path prefix if present, else cookie, else default. */
export function resolvePortalLocale(input: {
  pathname?: string | null;
  cookieLocale?: string | null;
  locales?: string[];
}): string {
  const locales = input.locales?.length ? input.locales : [...routing.locales];
  const pathname = input.pathname?.trim() ?? "";
  if (pathname.startsWith("/")) {
    const seg = pathname.split("/")[1];
    if (seg && locales.includes(seg)) return seg;
  }
  const cookie = input.cookieLocale?.trim();
  if (cookie && locales.includes(cookie)) return cookie;
  return routing.defaultLocale;
}
