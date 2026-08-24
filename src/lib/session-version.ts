import "server-only";

import { prisma } from "@/lib/prisma";

/** Bump sessionVersion so existing JWTs are rejected on sensitive checks. */
export async function bumpUserSessionVersion(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}
