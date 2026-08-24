export function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function siteUrlToDomain(siteUrl: string): string {
  try {
    const hostname = new URL(siteUrl).hostname;
    if (isLocalhostHost(hostname)) {
      const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      if (env) {
        try {
          return new URL(env).hostname;
        } catch {
          // fall through
        }
      }
    }
    return hostname;
  } catch {
    return "localhost";
  }
}
