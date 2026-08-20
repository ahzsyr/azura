import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { DownloadUnlockMethod } from "@prisma/client";

function createUnlockToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function createDownloadUnlock(input: {
  mediaAssetId: string;
  email?: string;
  unlockMethod: DownloadUnlockMethod;
  expiryHours: number;
}) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: input.mediaAssetId } });
  if (!asset) throw new Error("Asset not found");

  const token = createUnlockToken();
  const expiresAt = new Date(Date.now() + input.expiryHours * 60 * 60 * 1000);

  const unlock = await prisma.downloadGateUnlock.create({
    data: {
      token,
      mediaAssetId: input.mediaAssetId,
      email: input.email,
      unlockMethod: input.unlockMethod,
      expiresAt,
    },
    include: { mediaAsset: true },
  });

  return unlock;
}

export async function getDownloadUnlock(token: string) {
  const unlock = await prisma.downloadGateUnlock.findUnique({
    where: { token },
    include: { mediaAsset: true },
  });
  if (!unlock) return null;
  if (unlock.expiresAt < new Date()) return null;
  return unlock;
}

export async function consumeDownloadUnlock(token: string) {
  const unlock = await getDownloadUnlock(token);
  if (!unlock) return null;

  if (unlock.usedAt) {
    return unlock;
  }

  return prisma.downloadGateUnlock.update({
    where: { token },
    data: { usedAt: new Date() },
    include: { mediaAsset: true },
  });
}
