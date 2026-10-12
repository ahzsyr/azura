import type { ModuleManifest, PackageKind } from "@/modules/module-manifest";

export const AZURA_PACKAGE_MANIFEST = "azura-package.json";
export const AZURA_CORE_VERSION = "0.1.0";

export type PackageStatus = "installed" | "active" | "inactive" | "pending";

export type PackageContributions = {
  adminNavItemIds: string[];
  adminRoutePrefixes: string[];
  publicRoutePrefixes: string[];
  blockTypes: string[];
  dashboardSections: string[];
};

/** Manifest stored in a package ZIP and on PackageInstallation.manifest. */
export type PackageManifest = {
  id: string;
  version: string;
  kind: PackageKind;
  azuraCompatibility: string;
  requiredPackages: string[];
  requiredCapabilities: string[];
  requiredPresets: string[];
  permissions: string[];
  label: string;
  contributions: PackageContributions;
};

export type ManifestValidation =
  | { ok: true; manifest: PackageManifest }
  | { ok: false; errors: string[] };

const KINDS = new Set<PackageKind>(["app", "extension", "theme"]);

function stringList(value: unknown, field: string, errors: string[]): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    errors.push(`${field} must be a list of strings`);
    return [];
  }
  return value;
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
      publicRoutePrefixes: manifest.publicRoutes.filter((route) => !route.startsWith("/api/")),
      blockTypes: [...manifest.contributedBlockTypes],
      dashboardSections: [manifest.label ?? manifest.id],
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
  const azuraCompatibility =
    typeof record.azuraCompatibility === "string" && record.azuraCompatibility.trim()
      ? record.azuraCompatibility.trim()
      : "*";
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) errors.push("id must be a lowercase slug");
  if (!/^\d+\.\d+\.\d+$/.test(version)) errors.push("version must be major.minor.patch");
  if (typeof kind !== "string" || !KINDS.has(kind as PackageKind)) {
    errors.push("kind must be app, extension, or theme");
  }
  const contributionsRaw = record.contributions;
  const contributions =
    contributionsRaw && typeof contributionsRaw === "object"
      ? (contributionsRaw as Record<string, unknown>)
      : {};
  const manifest: PackageManifest = {
    id,
    version,
    kind: (typeof kind === "string" ? kind : "app") as PackageKind,
    azuraCompatibility,
    requiredPackages: stringList(record.requiredPackages, "requiredPackages", errors),
    requiredCapabilities: stringList(record.requiredCapabilities, "requiredCapabilities", errors),
    requiredPresets: stringList(record.requiredPresets, "requiredPresets", errors),
    permissions: stringList(record.permissions, "permissions", errors),
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : id,
    contributions: {
      adminNavItemIds: stringList(contributions.adminNavItemIds, "contributions.adminNavItemIds", errors),
      adminRoutePrefixes: stringList(contributions.adminRoutePrefixes, "contributions.adminRoutePrefixes", errors),
      publicRoutePrefixes: stringList(contributions.publicRoutePrefixes, "contributions.publicRoutePrefixes", errors),
      blockTypes: stringList(contributions.blockTypes, "contributions.blockTypes", errors),
      dashboardSections: stringList(contributions.dashboardSections, "contributions.dashboardSections", errors),
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

const ZIP_ENTRY = /^(azura-package\.json|migrations\/[a-z0-9][a-z0-9._-]*\.(up|down)\.sql)$/;

export function validateZipEntryName(name: string): boolean {
  return ZIP_ENTRY.test(name);
}
