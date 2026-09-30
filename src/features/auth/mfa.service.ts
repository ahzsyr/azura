import "server-only";

import { randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";
import { prisma } from "@/lib/prisma";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";
import { hashRecoveryCode, writeSecurityAuditLog } from "@/lib/security-audit";
import { bumpUserSessionVersion } from "@/lib/session-version";

const ISSUER = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Azura Admin";

function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(5).toString("hex").toUpperCase().replace(/(.{4})(.{4})(.{2})/, "$1-$2-$3"),
  );
}

export async function beginTotpEnrollment(userId: string, email: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const sealed = sealSecret(secret.base32);
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: sealed, totpEnabled: false },
  });

  return {
    secret: secret.base32,
    otpauthUrl: totp.toString(),
  };
}

export async function confirmTotpEnrollment(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) throw new Error("No pending TOTP secret");

  const base32 = unsealSecret(user.totpSecret);
  if (!base32) throw new Error("Invalid TOTP secret");

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32),
  });

  const delta = totp.validate({ token: code.trim(), window: 1 });
  if (delta === null) throw new Error("Invalid authenticator code");

  const recoveryCodes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
    prisma.mfaRecoveryCode.createMany({
      data: recoveryCodes.map((code) => ({
        id: `mfa_${randomBytes(10).toString("hex")}`,
        userId,
        codeHash: hashRecoveryCode(code),
      })),
    }),
  ]);

  await bumpUserSessionVersion(userId);
  await writeSecurityAuditLog({
    action: "mfa.enrolled",
    actorId: userId,
    actorRole: user.role,
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: userId,
    actorRole: user.role,
    meta: { reason: "MFA_ENABLED" },
  });

  return { recoveryCodes };
}

export async function verifyTotpOrRecovery(
  userId: string,
  code: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpEnabled || !user.totpSecret) return true;

  const base32 = unsealSecret(user.totpSecret);
  if (base32) {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32),
    });
    if (totp.validate({ token: code.trim(), window: 1 }) !== null) {
      return true;
    }
  }

  const codeHash = hashRecoveryCode(code);
  const recovery = await prisma.mfaRecoveryCode.findFirst({
    where: { userId, codeHash, usedAt: null },
  });
  if (!recovery) return false;

  await prisma.mfaRecoveryCode.update({
    where: { id: recovery.id },
    data: { usedAt: new Date() },
  });
  await writeSecurityAuditLog({
    action: "mfa.recovery_used",
    actorId: userId,
    actorRole: user.role,
  });
  return true;
}

export async function disableTotp(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
  ]);
  await bumpUserSessionVersion(userId);
  await writeSecurityAuditLog({
    action: "mfa.disabled",
    actorId: userId,
    actorRole: user?.role,
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: userId,
    actorRole: user?.role,
    meta: { reason: "MFA_DISABLED" },
  });
}

/** Disable MFA after verifying current password or a valid TOTP/recovery code. */
export async function disableTotpWithReauth(
  userId: string,
  input: { password?: string; mfaCode?: string },
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  let ok = false;
  if (input.password?.trim()) {
    const bcrypt = await import("bcryptjs");
    ok = await bcrypt.compare(input.password, user.passwordHash);
  }
  if (!ok && input.mfaCode?.trim()) {
    ok = await verifyTotpOrRecovery(userId, input.mfaCode);
  }
  if (!ok) throw new Error("Reauthentication failed");

  await disableTotp(userId);
}

export async function userRequiresTotp(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });
  return Boolean(user?.totpEnabled);
}
