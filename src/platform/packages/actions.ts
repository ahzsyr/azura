"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSection } from "@/features/auth/guards";
import {
  activatePackage,
  deactivatePackage,
  exportPackageZip,
  importPackageZip,
  PackageInstallerError,
  updatePackage,
  uninstallPackage,
} from "@/platform/packages/installer";
import { auditPackageLifecycle } from "@/platform/packages/package-lifecycle-audit";
import {
  preflightPackageOperation,
  type PackagePreflightOperation,
  type PackagePreflightResult,
} from "@/platform/packages/package-preflight";

export type PackageFileResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string };

export type PackageActionResult = { ok: true } | { ok: false; error: string };

function errorMessage(error: unknown): string {
  if (error instanceof PackageInstallerError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not complete the package operation";
}

function revalidateModules(): void {
  revalidatePath("/admin/modules");
  revalidatePath("/admin");
}

export async function runPackagePreflight(
  packageId: string,
  operation: PackagePreflightOperation,
): Promise<PackagePreflightResult> {
  await requireAdminSection("system");
  return preflightPackageOperation(packageId, operation);
}

export async function exportInstalledPackage(packageId: string): Promise<PackageFileResult> {
  await requireAdminSection("system");
  try {
    const zip = await exportPackageZip(packageId);
    return {
      ok: true,
      filename: `${packageId}.zip`,
      base64: zip.toString("base64"),
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function importInstalledPackage(
  formData: FormData,
): Promise<{ ok: true; packageId: string; status: string } | { ok: false; error: string }> {
  await requireAdminSection("system");
  const file = formData.get("package");
  if (!(file instanceof File)) return { ok: false, error: "Choose a package ZIP to import" };
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const record = await importPackageZip(bytes);
    await auditPackageLifecycle({
      op: "import",
      packageId: record.packageId,
      ok: true,
    });
    revalidateModules();
    return { ok: true, packageId: record.packageId, status: record.status };
  } catch (error) {
    const reason = errorMessage(error);
    await auditPackageLifecycle({
      op: "import",
      packageId: "unknown",
      ok: false,
      reason,
    });
    return { ok: false, error: reason };
  }
}

export async function updateInstalledPackage(packageId: string): Promise<PackageActionResult> {
  await requireAdminSection("system");
  try {
    await updatePackage(packageId);
    await auditPackageLifecycle({ op: "update", packageId, ok: true });
    revalidateModules();
    return { ok: true };
  } catch (error) {
    const reason = errorMessage(error);
    await auditPackageLifecycle({ op: "update", packageId, ok: false, reason });
    return { ok: false, error: reason };
  }
}

/** M7.1 — Open extension overlay (activatePackage). */
export async function openExtensionOverlay(packageId: string): Promise<PackageActionResult> {
  await requireAdminSection("system");
  try {
    await activatePackage(packageId);
    await auditPackageLifecycle({ op: "openExtension", packageId, ok: true });
    revalidateModules();
    return { ok: true };
  } catch (error) {
    const reason = errorMessage(error);
    await auditPackageLifecycle({ op: "openExtension", packageId, ok: false, reason });
    return { ok: false, error: reason };
  }
}

/** M7.1 — Close extension overlay (deactivatePackage; arms closed / hides admin gates). */
export async function closeExtensionOverlay(packageId: string): Promise<PackageActionResult> {
  await requireAdminSection("system");
  try {
    await deactivatePackage(packageId);
    await auditPackageLifecycle({ op: "closeExtension", packageId, ok: true });
    revalidateModules();
    return { ok: true };
  } catch (error) {
    const reason = errorMessage(error);
    await auditPackageLifecycle({ op: "closeExtension", packageId, ok: false, reason });
    return { ok: false, error: reason };
  }
}

/** Theme token package — Apply (activatePackage). */
export async function applyThemePackage(packageId: string): Promise<PackageActionResult> {
  await requireAdminSection("system");
  try {
    await activatePackage(packageId);
    await auditPackageLifecycle({ op: "applyTheme", packageId, ok: true });
    revalidateModules();
    return { ok: true };
  } catch (error) {
    const reason = errorMessage(error);
    await auditPackageLifecycle({ op: "applyTheme", packageId, ok: false, reason });
    return { ok: false, error: reason };
  }
}

/** Theme token package — soft Deactivate (clears provenance; live look stays). */
export async function deactivateThemePackage(packageId: string): Promise<PackageActionResult> {
  await requireAdminSection("system");
  try {
    await deactivatePackage(packageId);
    await auditPackageLifecycle({ op: "deactivate", packageId, ok: true });
    revalidateModules();
    return { ok: true };
  } catch (error) {
    const reason = errorMessage(error);
    await auditPackageLifecycle({ op: "deactivate", packageId, ok: false, reason });
    return { ok: false, error: reason };
  }
}

/** Soft uninstall — never destructive. Included builtins deactivate and keep the ledger. */
export async function uninstallInstalledPackage(packageId: string): Promise<PackageActionResult> {
  await requireAdminSection("system");
  try {
    await uninstallPackage(packageId, false);
    await auditPackageLifecycle({ op: "uninstall", packageId, ok: true });
    revalidateModules();
    return { ok: true };
  } catch (error) {
    const reason = errorMessage(error);
    await auditPackageLifecycle({ op: "uninstall", packageId, ok: false, reason });
    return { ok: false, error: reason };
  }
}

/**
 * Typed Remove for pending / non-builtin ledger rows only.
 * confirmPhrase must equal packageId; installer refuses builtins before any down SQL.
 */
export async function removeInstalledPackage(
  packageId: string,
  confirmPhrase: string,
): Promise<PackageActionResult> {
  await requireAdminSection("system");
  if (confirmPhrase.trim() !== packageId) {
    return { ok: false, error: `Type ${packageId} to confirm removal` };
  }
  try {
    await uninstallPackage(packageId, true);
    await auditPackageLifecycle({ op: "remove", packageId, ok: true });
    revalidateModules();
    return { ok: true };
  } catch (error) {
    const reason = errorMessage(error);
    await auditPackageLifecycle({ op: "remove", packageId, ok: false, reason });
    return { ok: false, error: reason };
  }
}
