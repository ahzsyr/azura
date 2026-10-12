"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { exportPackageZip, importPackageZip, PackageInstallerError } from "@/platform/packages/installer";

export type PackageFileResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string };

function errorMessage(error: unknown): string {
  if (error instanceof PackageInstallerError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not complete the package operation";
}

export async function exportInstalledPackage(packageId: string): Promise<PackageFileResult> {
  await requireAdmin();
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

export async function importInstalledPackage(formData: FormData): Promise<{ ok: true; packageId: string; status: string } | { ok: false; error: string }> {
  await requireAdmin();
  const file = formData.get("package");
  if (!(file instanceof File)) return { ok: false, error: "Choose a package ZIP to import" };
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const record = await importPackageZip(bytes);
    revalidatePath("/admin/modules");
    revalidatePath("/admin");
    return { ok: true, packageId: record.packageId, status: record.status };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
