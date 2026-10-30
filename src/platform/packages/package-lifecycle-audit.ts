import { writeSecurityAuditLog } from "@/lib/security-audit";
import { recoveryHintForPackageError } from "@/platform/packages/package-recovery-hints";

export { recoveryHintForPackageError };

export type PackageLifecycleOp =
  | "import"
  | "activate"
  | "deactivate"
  | "update"
  | "uninstall"
  | "remove"
  | "applyTheme"
  | "openExtension"
  | "closeExtension";

/** Audit package lifecycle without secret payloads. */
export async function auditPackageLifecycle(input: {
  op: PackageLifecycleOp;
  packageId: string;
  ok: boolean;
  reason?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
}): Promise<void> {
  await writeSecurityAuditLog({
    action: input.ok ? `package.${input.op}.ok` : `package.${input.op}.fail`,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole ?? null,
    meta: {
      packageId: input.packageId,
      op: input.op,
      ok: input.ok,
      ...(input.reason ? { reason: input.reason.slice(0, 240) } : {}),
    },
  });
}
