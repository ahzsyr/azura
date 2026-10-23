import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSiteUrl } from "@/config/site";

const GOOGLE_OAUTH_CALLBACK_PATH = "/api/seo/analytics/google/oauth/callback";

function trimEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function originFromUrl(raw: string): string | undefined {
  try {
    return new URL(raw.replace(/\/$/, "") || raw).origin;
  } catch {
    return undefined;
  }
}

function isBindAddress(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "0.0.0.0" || host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function isInvalidOAuthHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "0.0.0.0") return true;
  if (process.env.NODE_ENV !== "production") {
    return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host);
  }
  return false;
}

/**
 * Bind addresses are not a public origin. In production, localhost is the same
 * mistake: the process is behind the public domain, not a local browser.
 */
function hostNeedsPublicOrigin(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "0.0.0.0") return true;
  if (
    process.env.NODE_ENV === "production" &&
    (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]")
  ) {
    return true;
  }
  return isInvalidOAuthHost(host);
}

/** First configured origin that is a real domain, skipping bind addresses. */
function configuredPublicOrigin(): string | undefined {
  const candidates = [
    trimEnv("NEXT_PUBLIC_SITE_URL"),
    trimEnv("AUTH_URL"),
    trimEnv("NEXTAUTH_URL"),
  ];
  for (const candidate of candidates) {
    const origin = candidate ? originFromUrl(candidate) : undefined;
    if (!origin) continue;
    try {
      if (!isBindAddress(new URL(origin).hostname)) return origin;
    } catch {
      continue;
    }
  }
  return undefined;
}

/** Map hosts the browser cannot use (e.g. 0.0.0.0) onto the public site, or localhost in local dev. */
export function normalizeOAuthHost(origin: string): string {
  try {
    const url = new URL(origin);
    if (!hostNeedsPublicOrigin(url.hostname)) {
      return url.origin;
    }
    const configured = configuredPublicOrigin();
    if (configured) return configured;
    if (isInvalidOAuthHost(url.hostname)) {
      const portSuffix = url.port ? `:${url.port}` : "";
      return new URL(`${url.protocol}//localhost${portSuffix}`).origin;
    }
    return url.origin;
  } catch {
    const configured = configuredPublicOrigin();
    if (configured) return configured;
    const port = process.env.PORT ?? "3000";
    return `http://localhost:${port}`;
  }
}

function getConfiguredSiteOrigin(): string | undefined {
  const configured = configuredPublicOrigin();
  if (configured) return configured;

  const candidates = [
    trimEnv("NEXT_PUBLIC_SITE_URL"),
    trimEnv("AUTH_URL"),
    trimEnv("NEXTAUTH_URL"),
  ];

  for (const candidate of candidates) {
    const origin = candidate ? originFromUrl(candidate) : undefined;
    if (origin) {
      return normalizeOAuthHost(origin);
    }
  }

  const fallback = originFromUrl(getSiteUrl());
  return fallback ? normalizeOAuthHost(fallback) : undefined;
}

/**
 * Auth.js redirect callback. Relative sign-out paths stay on the public domain
 * when the request host is the process bind address (0.0.0.0) or, in production,
 * localhost.
 */
export function rewriteAuthRedirect(url: string, baseUrl: string): string {
  const publicBase = normalizeOAuthHost(baseUrl);
  if (url.startsWith("/") && !url.startsWith("//")) {
    return new URL(url, publicBase).href;
  }
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return publicBase;
  }
  const allowed = new Set<string>([new URL(publicBase).origin]);
  try {
    allowed.add(new URL(baseUrl).origin);
  } catch {
    // baseUrl was already normalized above
  }
  const configured = configuredPublicOrigin();
  if (configured) allowed.add(new URL(configured).origin);
  if (allowed.has(target.origin) || hostNeedsPublicOrigin(target.hostname)) {
    return new URL(`${target.pathname}${target.search}${target.hash}`, publicBase).href;
  }
  return publicBase;
}

/** Rewrite an absolute Location that points at the bind address onto the public site. */
export function rewriteBindHostLocation(location: string): string {
  try {
    const target = new URL(location);
    if (!hostNeedsPublicOrigin(target.hostname)) return location;
    const configured = configuredPublicOrigin();
    if (!configured) return location;
    return new URL(`${target.pathname}${target.search}${target.hash}`, configured).href;
  } catch {
    return location;
  }
}

/** Env-based fallback when the request host is missing or invalid for OAuth. */
export function getCanonicalAppOrigin(): string {
  const configured = getConfiguredSiteOrigin();
  if (configured) {
    return configured;
  }

  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

type OriginHeaderInput = {
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  fallbackOrigin?: string | null;
};

function protocolFromFallback(fallbackOrigin?: string | null): string {
  if (fallbackOrigin) {
    try {
      return new URL(fallbackOrigin).protocol.replace(":", "");
    } catch {
      // fall through
    }
  }
  return process.env.NODE_ENV === "production" ? "https" : "http";
}

function resolveOriginFromHeaderInput(input: OriginHeaderInput): string | undefined {
  const forwardedHost = input.forwardedHost?.split(",")[0]?.trim();
  const forwardedProto = input.forwardedProto?.split(",")[0]?.trim();

  if (forwardedHost) {
    const protocol =
      forwardedProto ??
      (input.fallbackOrigin
        ? protocolFromFallback(input.fallbackOrigin)
        : process.env.NODE_ENV === "production"
          ? "https"
          : "http");
    return normalizeOAuthHost(`${protocol}://${forwardedHost}`);
  }

  const host = input.host?.split(",")[0]?.trim();
  if (host) {
    const protocol = forwardedProto ?? protocolFromFallback(input.fallbackOrigin);
    return normalizeOAuthHost(`${protocol}://${host}`);
  }

  if (input.fallbackOrigin) {
    return normalizeOAuthHost(input.fallbackOrigin);
  }

  return undefined;
}

/** Resolve the public origin for the current request (Vercel/Hostinger/proxy-safe). */
export function resolveRequestOrigin(request: NextRequest): string {
  return (
    resolveOriginFromHeaderInput({
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
      host: request.headers.get("host"),
      fallbackOrigin: request.nextUrl.origin,
    }) ?? getCanonicalAppOrigin()
  );
}

/** Resolve the public origin from Next.js request headers (server components / actions). */
export function getAppOriginFromHeaders(headerStore: Headers): string {
  const rawHost = headerStore.get("host")?.split(":")[0] ?? "";
  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedHostname = forwardedHost?.split(":")[0] ?? forwardedHost;

  if (isInvalidOAuthHost(rawHost) || (forwardedHostname && isInvalidOAuthHost(forwardedHostname))) {
    return getCanonicalAppOrigin();
  }

  return (
    resolveOriginFromHeaderInput({
      forwardedHost: headerStore.get("x-forwarded-host"),
      forwardedProto: headerStore.get("x-forwarded-proto"),
      host: headerStore.get("host"),
    }) ?? getCanonicalAppOrigin()
  );
}

export async function getServerAppOrigin(): Promise<string> {
  const { headers } = await import("next/headers");
  return getAppOriginFromHeaders(await headers());
}

export async function getServerAppUrl(path: string): Promise<string> {
  return new URL(path, await getServerAppOrigin()).href;
}

/** Prefer the domain the admin is actually using; fall back to env/localhost for invalid hosts. */
export function getOAuthOrigin(request: NextRequest): string {
  const rawHost = request.nextUrl.hostname;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedHostname = forwardedHost?.split(":")[0] ?? forwardedHost;

  if (isInvalidOAuthHost(rawHost) || (forwardedHostname && isInvalidOAuthHost(forwardedHostname))) {
    return getCanonicalAppOrigin();
  }

  return resolveRequestOrigin(request);
}

export function getGoogleOAuthRedirectUri(request: NextRequest): string {
  return new URL(GOOGLE_OAUTH_CALLBACK_PATH, getOAuthOrigin(request)).href;
}

export function getRequestAppUrl(request: NextRequest, path: string): string {
  return new URL(path, getOAuthOrigin(request)).href;
}

/** @deprecated Use getRequestAppUrl(request, path) for multi-domain support. */
export function getCanonicalAppUrl(path: string): string {
  return new URL(path, getCanonicalAppOrigin()).href;
}

/** Redirect OAuth traffic only when the request host is invalid for Google OAuth (e.g. 0.0.0.0). */
export function ensureCanonicalOAuthRequest(request: NextRequest): NextResponse | null {
  if (!isInvalidOAuthHost(request.nextUrl.hostname)) {
    return null;
  }

  const canonicalOrigin = getCanonicalAppOrigin();
  try {
    if (new URL(canonicalOrigin).hostname === request.nextUrl.hostname) {
      return null;
    }
  } catch {
    return null;
  }

  const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonicalOrigin);
  return NextResponse.redirect(target);
}
