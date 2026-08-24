import "server-only";

import { prisma } from "@/lib/prisma";

export async function listAdminAssignees() {
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, disabledAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 50,
  });
}
