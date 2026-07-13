import rawProfile from "@/generated/deployment-profile.json";
import type { CompiledDeploymentProfile, DeploymentProfileId } from "./types";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

const profile = rawProfile as CompiledDeploymentProfile;

const FALLBACK_LOCALE_PREFIXES = FALLBACK_LOCALES.map((l) => l.urlPrefix);

export function getDeploymentProfile(): CompiledDeploymentProfile {
  return profile;
}

export function getActiveProfileId(): DeploymentProfileId {
  return profile.profileId;
}

export function isPresetEnabled(presetId: string): boolean {
  if (!profile.generated) return true;
  return profile.presets.includes(presetId);
}

export function isCapabilityEnabled(capabilityId: string): boolean {
  if (!profile.generated) return true;
  return profile.capabilities.includes(capabilityId);
}

export function isModuleEnabled(moduleId: string): boolean {
  if (!profile.generated) return true;
  return profile.modules.includes(moduleId);
}

export function isAdminNavItemEnabled(navItemId: string): boolean {
  if (!profile.generated) return true;
  return profile.enabledNavItemIds.includes(navItemId);
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAdminPathDisabled(pathname: string): boolean {
  if (!profile.generated || !profile.disabledAdminPrefixes.length) return false;
  return profile.disabledAdminPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isApiPathDisabled(pathname: string): boolean {
  if (!profile.generated || !profile.disabledApiPrefixes.length) return false;
  return profile.disabledApiPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

/** Strip locale prefix and test first path segment against disabled public segments. */
export function isPublicPathDisabled(pathname: string, locales?: string[]): boolean {
  if (!profile.generated || !profile.disabledPublicSegments.length) return false;

  const localeList = locales?.length ? locales : FALLBACK_LOCALE_PREFIXES;
  let rest = pathname;
  for (const locale of localeList) {
    const prefix = `/${locale}`;
    if (rest === prefix) return false;
    if (rest.startsWith(`${prefix}/`)) {
      rest = rest.slice(prefix.length);
      break;
    }
  }

  const segment = rest.replace(/^\//, "").split("/")[0];
  if (!segment) return false;
  return profile.disabledPublicSegments.includes(segment);
}

export function isAdminHrefEnabled(href: string): boolean {
  if (!profile.generated) return true;
  if (href === "/admin") return isAdminNavItemEnabled("dashboard");
  if (isAdminPathDisabled(href)) return false;
  return true;
}
