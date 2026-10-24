import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeVisitorToken } from "@/features/account/admin/visitor-link-policy";

export async function linkVisitorTokenToUser(
  userId: string,
  rawToken: unknown,
): Promise<{ linked: boolean }> {
  const token = normalizeVisitorToken(rawToken);
  if (!token || !userId) return { linked: false };
  try {
    const visitor = await prisma.marketingVisitor.findUnique({
      where: { visitorToken: token },
      select: { id: true },
    });
    if (!visitor) return { linked: false };
    await prisma.userVisitorLink.upsert({
      where: { userId_visitorId: { userId, visitorId: visitor.id } },
      create: { userId, visitorId: visitor.id },
      update: { lastSeenAt: new Date() },
    });
    return { linked: true };
  } catch (error) {
    console.warn("[visitor-link] save failed", error instanceof Error ? error.name : "unknown");
    return { linked: false };
  }
}
