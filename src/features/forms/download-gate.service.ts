import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { DownloadUnlockMethod } from "@prisma/client";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createUnlockToken(): string {
  return randomBytes(32).toString("hex");
}

const MAX_SUBMISSION_AGE_MS = 60 * 60 * 1000; // 1 hour

export async function createDownloadUnlock(input: {
  mediaAssetId: string;
  email?: string;
  unlockMethod: DownloadUnlockMethod;
  expiryHours: number;
  submissionId?: string;
  subscriberId?: string;
}): Promise<{ rawToken: string; expiresAt: Date; mediaAssetId: string }> {
  if (input.unlockMethod === "EXTERNAL") {
    throw new Error("EXTERNAL unlock does not mint download tokens");
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { id: input.mediaAssetId } });
  if (!asset) throw new Error("Asset not found");

  if (input.unlockMethod === "FORM") {
    if (!input.submissionId?.trim()) {
      throw new Error("submissionId required for FORM unlock");
    }
    const submission = await prisma.formSubmission.findUnique({
      where: { id: input.submissionId },
    });
    if (!submission) throw new Error("Invalid submission");
    if (Date.now() - submission.createdAt.getTime() > MAX_SUBMISSION_AGE_MS) {
      throw new Error("Submission expired for unlock");
    }
    // Bind to downloadGate block when present
    if (submission.blockType && submission.blockType !== "downloadGate") {
      throw new Error("Submission not eligible for download unlock");
    }
  } else if (input.unlockMethod === "NEWSLETTER") {
    if (!input.subscriberId?.trim()) {
      throw new Error("subscriberId required for NEWSLETTER unlock");
    }
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id: input.subscriberId },
    });
    if (!subscriber || subscriber.status !== "CONFIRMED") {
      throw new Error("Subscriber not confirmed");
    }
    if (input.email && subscriber.email.toLowerCase() !== input.email.toLowerCase()) {
      throw new Error("Email mismatch");
    }
  } else {
    throw new Error("Unsupported unlock method");
  }

  const rawToken = createUnlockToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + input.expiryHours * 60 * 60 * 1000);

  await prisma.downloadGateUnlock.create({
    data: {
      token: tokenHash,
      mediaAssetId: input.mediaAssetId,
      email: input.email,
      unlockMethod: input.unlockMethod,
      expiresAt,
    },
  });

  try {
    await prisma.mediaAsset.update({
      where: { id: input.mediaAssetId },
      data: { visibility: "GATED" },
    });
  } catch {
    // visibility column may not exist until migrate
  }

  return { rawToken, expiresAt, mediaAssetId: input.mediaAssetId };
}

export async function getDownloadUnlock(rawToken: string) {
  const tokenHash = hashToken(rawToken.trim());
  const unlock = await prisma.downloadGateUnlock.findUnique({
    where: { token: tokenHash },
    include: { mediaAsset: true },
  });
  if (!unlock) return null;
  if (unlock.expiresAt < new Date()) return null;
  return unlock;
}

export async function consumeDownloadUnlock(rawToken: string) {
  const unlock = await getDownloadUnlock(rawToken);
  if (!unlock) return null;

  if (unlock.usedAt) {
    // Allow re-download within expiry window after first use (same hashed token).
    return unlock;
  }

  const tokenHash = hashToken(rawToken.trim());
  return prisma.downloadGateUnlock.update({
    where: { token: tokenHash },
    data: { usedAt: new Date() },
    include: { mediaAsset: true },
  });
}
