import type { ModuleManifest, PackageKind } from "@/modules/module-manifest";
import {
  PACKAGE_CONTRIBUTION_KEY_SET,
  REMOVED_CONTRIBUTION_KEYS,
} from "@/platform/packages/contribution-inventory";

export const AZURA_PACKAGE_MANIFEST = "azura-package.json";
export const AZURA_CORE_VERSION = "0.1.0";

export type PackageStatus = "installed" | "active" | "inactive" | "pending";

/**
 * Declarative contribution surfaces (Option C). See CONTRIBUTION_INVENTORY for
 * operational vs declared-only status of each key. Unknown keys (e.g. themeTokens)
 * are rejected by validatePackageManifest.
 */
export type PackageContributions = {
  /** Operational — mirrored from ModuleManifest.navItemIds; inactive modules hide these in admin nav. */
  adminNavItemIds: string[];
  /** Operational — first prefix powers ActivePackageSections dashboard links (href[0] only). */
  adminRoutePrefixes: string[];
  /** Operational — mirrored from ModuleManifest.contributedBlockTypes; gated via isBlockTypeEnabled. */
  blockTypes: string[];
};

/**
 * Manifest stored in a package ZIP and on PackageInstallation.manifest.
 *
 * Field semantics (Option A + C):
 * - `requiredPackages` — installer activation graph (must be status=active).
 * - `requiredPresets` — SiteFeature cascade via expandFeatureToggles.
 * - `requiredCapabilities` — profile ceiling / Modules screen display (not installer-enforced at activate).
 * - `permissions` — for apps: registered ACL keys `{id}.read` / `{id}.manage` (Phase 3).
 * - `contributions` — see PackageContributions + CONTRIBUTION_INVENTORY (Phase 4: only
 *   adminNavItemIds, adminRoutePrefixes, blockTypes). Public/API gating uses ModuleManifest
 *   → MODULE_ROUTE_REGISTRY, not package contributions.
 * - Theme tokens are not a package contribution; SiteTheme / theme studio own them.
 */
export type PackageManifest = {
  id: string;
  version: string;
  kind: PackageKind;
  azuraCompatibility: string;
  requiredPackages: string[];
  requiredCapabilities: string[];
  requiredPresets: string[];
  /** App ACL keys `{id}.read` / `{id}.manage` (Phase 3). Extensions/themes should leave empty. */
  permissions: string[];
  label: string;
  contributions: PackageContributions;
};

export type ManifestValidation =
  | { ok: true; manifest: PackageManifest }
  | { ok: false; errors: string[] };

const KINDS = new Set<PackageKind>(["app", "extension", "theme"]);
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const COMPAT_RANGE = /^\*\s*$|^>=\d+\.\d+\.\d+$/;

function stringList(value: unknown, field: string, errors: string[]): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    errors.push(`${field} must be a list of strings`);
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const trimmed = entry.trim();
    if (!trimmed) {
      errors.push(`${field} must not contain empty strings`);
      continue;
    }
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Package / preset / capability ids: lowercase slugs, trimmed, deduped. */
function slugIdList(value: unknown, field: string, errors: string[]): string[] {
  const list = stringList(value, field, errors);
  const out: string[] = [];
  for (const entry of list) {
    if (!SLUG.test(entry)) {
      errors.push(`${field} entries must be lowercase slugs (got "${entry}")`);
      continue;
    }
    out.push(entry);
  }
  return out;
}

/** Path prefixes consumed as hrefs / route gates — must start with `/`. */
function pathPrefixList(value: unknown, field: string, errors: string[]): string[] {
  const list = stringList(value, field, errors);
  const out: string[] = [];
  for (const entry of list) {
    if (!entry.startsWith("/")) {
      errors.push(`${field} entries must start with / (got "${entry}")`);
      continue;
    }
    out.push(entry);
  }
  return out;
}

export function packageManifestFromModule(manifest: ModuleManifest): PackageManifest {
  return {
    id: manifest.id,
    version: manifest.version,
    kind: manifest.packageKind,
    azuraCompatibility: manifest.azuraCompatibility,
    requiredPackages: [...manifest.requiredPackages],
    requiredCapabilities: [...manifest.requiredCapabilities],
    requiredPresets: [...manifest.requiredPresets],
    permissions: [...manifest.permissions],
    label: manifest.label ?? manifest.id,
    contributions: {
      adminNavItemIds: [...manifest.navItemIds],
      adminRoutePrefixes: [...manifest.adminRoutes],
      blockTypes: [...manifest.contributedBlockTypes],
    },
  };
}

export function validatePackageManifest(raw: unknown): ManifestValidation {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["Package manifest must be an object"] };
  }
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const version = typeof record.version === "string" ? record.version.trim() : "";
  const kind = record.kind;
  const azuraCompatibilityRaw =
    typeof record.azuraCompatibility === "string" && record.azuraCompatibility.trim()
      ? record.azuraCompatibility.trim()
      : "*";
  if (!SLUG.test(id)) errors.push("id must be a lowercase slug");
  if (!/^\d+\.\d+\.\d+$/.test(version)) errors.push("version must be major.minor.patch");
  if (typeof kind !== "string" || !KINDS.has(kind as PackageKind)) {
    errors.push("kind must be app, extension, or theme");
  }
  if (!COMPAT_RANGE.test(azuraCompatibilityRaw)) {
    errors.push("azuraCompatibility must be * or >=major.minor.patch");
  }
  const azuraCompatibility = azuraCompatibilityRaw === "*" ? "*" : azuraCompatibilityRaw;

  const contributionsRaw = record.contributions;
  const contributions =
    contributionsRaw && typeof contributionsRaw === "object"
      ? (contributionsRaw as Record<string, unknown>)
      : {};
  // Reject unknown / removed contribution keys (Phase 4: publicRoutePrefixes, dashboardSections).
  for (const key of Object.keys(contributions)) {
    if (PACKAGE_CONTRIBUTION_KEY_SET.has(key)) continue;
    if (REMOVED_CONTRIBUTION_KEYS.has(key)) {
      errors.push(
        `contributions.${key} was removed in Phase 4 (not operational). Public/API routes use ModuleManifest → MODULE_ROUTE_REGISTRY; dashboard uses label + adminRoutePrefixes[0]. Supported keys: ${[...PACKAGE_CONTRIBUTION_KEY_SET].join(", ")}`,
      );
      continue;
    }
    errors.push(
      `contributions.${key} is not a supported contribution type (supported: ${[...PACKAGE_CONTRIBUTION_KEY_SET].join(", ")}); theme tokens and executable contributions are not package-declared`,
    );
  }
  const requiredPackages = slugIdList(record.requiredPackages, "requiredPackages", errors);
  const requiredCapabilities = slugIdList(
    record.requiredCapabilities,
    "requiredCapabilities",
    errors,
  );
  const requiredPresets = slugIdList(record.requiredPresets, "requiredPresets", errors);
  if (id && requiredPackages.includes(id)) {
    errors.push("requiredPackages must not include the package id itself");
  }

  const permissions = stringList(record.permissions, "permissions", errors);
  const resolvedKind = (typeof kind === "string" ? kind : "app") as PackageKind;
  if (resolvedKind === "app" && id && SLUG.test(id)) {
    const allowed = new Set([`${id}.read`, `${id}.manage`]);
    for (const permission of permissions) {
      if (!allowed.has(permission)) {
        errors.push(
          `permissions for app “${id}” must be only “${id}.read” and/or “${id}.manage” (got “${permission}”)`,
        );
      }
    }
  } else if (permissions.length > 0 && resolvedKind !== "app") {
    // Extensions/themes do not register Module ACL keys; keep empty.
    errors.push(`permissions must be empty for kind “${resolvedKind}” (Module ACL is app-only)`);
  }

  const manifest: PackageManifest = {
    id,
    version,
    kind: resolvedKind,
    azuraCompatibility,
    requiredPackages,
    requiredCapabilities,
    requiredPresets,
    permissions,
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : id,
    contributions: {
      adminNavItemIds: stringList(
        contributions.adminNavItemIds,
        "contributions.adminNavItemIds",
        errors,
      ),
      adminRoutePrefixes: pathPrefixList(
        contributions.adminRoutePrefixes,
        "contributions.adminRoutePrefixes",
        errors,
      ),
      blockTypes: stringList(contributions.blockTypes, "contributions.blockTypes", errors),
    },
  };
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, manifest };
}

function parseVersion(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function comparePackageVersions(left: string, right: string): number {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);
  if (!parsedLeft || !parsedRight) return left.localeCompare(right);
  return compareVersions(parsedLeft, parsedRight);
}

function compareVersions(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/** `*` accepts every core version. `>=x.y.z` compares to AZURA_CORE_VERSION. */
export function isCompatibleWithCore(range: string, coreVersion = AZURA_CORE_VERSION): boolean {
  const trimmed = range.trim();
  if (trimmed === "*") return true;
  const minimum = trimmed.startsWith(">=") ? trimmed.slice(2).trim() : null;
  if (!minimum) return false;
  const core = parseVersion(coreVersion);
  const required = parseVersion(minimum);
  if (!core || !required) return false;
  return compareVersions(core, required) >= 0;
}

/**
 * Global ZIP entry allowlist. Kind-scoped filters (theme / extension / app) still
 * reject entries that are legal globally but illegal for that kind.
 * Debt: consolidate into one per-kind allow table (not this phase).
 */
const ZIP_ENTRY =
  /^(azura-package\.json|theme-tokens\.json|migrations\/[a-z0-9][a-z0-9._-]*\.(up|down)\.sql|assets\/logo\.(png|jpe?g|webp|svg)|assets\/favicon\.(png|webp|svg|ico)|fonts\/[A-Za-z0-9._-]+\.(woff2|woff|ttf|otf))$/;

export function validateZipEntryName(name: string): boolean {
  return ZIP_ENTRY.test(name);
}
