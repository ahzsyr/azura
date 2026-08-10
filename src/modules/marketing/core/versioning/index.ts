import type { ProviderVersionInfo } from "@/modules/marketing/core/manifests/types";
import { getProviderManifest } from "@/modules/marketing/core/registry";

export function isProviderVersionCompatible(
  installedApiVersion: string,
  version: ProviderVersionInfo,
): boolean {
  const installed = installedApiVersion.replace(/^v/i, "");
  const minimum = version.minimumSupportedVersion.replace(/^v/i, "");
  if (version.deprecatedAfter) {
    const deprecated = new Date(version.deprecatedAfter);
    if (!Number.isNaN(deprecated.getTime()) && deprecated.getTime() < Date.now()) {
      return false;
    }
  }
  return installed.localeCompare(minimum, undefined, { numeric: true, sensitivity: "base" }) >= 0;
}

export function checkProviderCompatibility(providerId: string, installedApiVersion?: string) {
  const manifest = getProviderManifest(providerId);
  if (!manifest) {
    return { ok: false, reason: "unknown_provider" as const };
  }
  const apiVersion = installedApiVersion ?? manifest.version.apiVersion;
  const ok = isProviderVersionCompatible(apiVersion, manifest.version);
  return {
    ok,
    reason: ok ? ("compatible" as const) : ("unsupported_or_deprecated" as const),
    version: manifest.version,
    apiVersion,
  };
}
