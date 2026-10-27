import "server-only";

import type { EmailOtpPurpose, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isEmailOtpChannelColumnError,
  isEmailOtpPurposeEnumError,
} from "@/features/auth/email-otp-token.helpers";

export { isEmailOtpPurposeEnumError } from "@/features/auth/email-otp-token.helpers";

type CreateOtpInput = {
  userId: string;
  purpose: EmailOtpPurpose | string;
  codeHash: string;
  expiresAt: Date;
  channel?: string;
};

/**
 * Persist a one-time code. Retries without `channel` when that column is
 * missing on older databases, so login OTP still works before the channel
 * migration is applied.
 */
export async function createEmailOtpToken(input: CreateOtpInput): Promise<void> {
  const base = {
    userId: input.userId,
    purpose: input.purpose as EmailOtpPurpose,
    codeHash: input.codeHash,
    expiresAt: input.expiresAt,
  };

  const withChannel: Prisma.EmailOtpTokenCreateArgs["data"] = {
    ...base,
    ...(input.channel ? { channel: input.channel } : {}),
  };

  try {
    await prisma.emailOtpToken.create({ data: withChannel });
  } catch (error) {
    if (isEmailOtpChannelColumnError(error) && input.channel) {
      await prisma.emailOtpToken.create({ data: base });
      return;
    }

    throw error;
  }
}
