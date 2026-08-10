import rawManifest from "@/generated/middleware-manifest.json";

export type MiddlewareManifestRedirect = {
  toPath: string;
  type: string;
};

export type MiddlewareManifestSetup = {
  setupComplete: boolean;
  registrationEnabled: boolean;
  comingSoonEnabled: boolean;
};

type MiddlewareManifest = {
  generated: boolean;
  manifestVersion: number;
  buildTimestamp: string;
  setup: MiddlewareManifestSetup | null;
  authSecret?: string | null;
  locales: {
    locales: string[];
    defaultLocale: string;
  };
  redirects: Record<string, MiddlewareManifestRedirect>;
};

const manifest = rawManifest as MiddlewareManifest;

export function isMiddlewareManifestGenerated(): boolean {
  return manifest.generated === true;
}

export function getMiddlewareManifestMeta() {
  return {
    manifestVersion: manifest.manifestVersion,
    buildTimestamp: manifest.buildTimestamp,
  };
}

export function getMiddlewareManifestSetup(): MiddlewareManifestSetup | null {
  if (!isMiddlewareManifestGenerated()) return null;
  return manifest.setup;
}

export function getMiddlewareManifestAuthSecret(): string | undefined {
  if (!isMiddlewareManifestGenerated()) return undefined;
  const secret = manifest.authSecret;
  return typeof secret === "string" && secret.trim().length >= 16 ? secret.trim() : undefined;
}

export function getMiddlewareManifestRouting() {
  if (!isMiddlewareManifestGenerated()) return null;
  const locales = manifest.locales.locales.filter(Boolean);
  if (locales.length === 0) return null;
  return {
    locales,
    defaultLocale: locales.includes(manifest.locales.defaultLocale)
      ? manifest.locales.defaultLocale
      : locales[0]!,
  };
}

export function getMiddlewareManifestRedirect(pathname: string): {
  generated: boolean;
  redirect: MiddlewareManifestRedirect | null;
} {
  if (!isMiddlewareManifestGenerated()) {
    return { generated: false, redirect: null };
  }
  return {
    generated: true,
    redirect: manifest.redirects[pathname] ?? null,
  };
}
