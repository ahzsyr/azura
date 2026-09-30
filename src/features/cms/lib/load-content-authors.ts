import { prisma } from "@/lib/prisma";

export async function loadContentAuthors() {
  return prisma.postAuthor.findMany({
    select: { id: true, name: true, avatarUrl: true, userId: true, createdAt: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
}
