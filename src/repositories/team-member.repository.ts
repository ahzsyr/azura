import "server-only";

import { prisma } from "@/lib/prisma";

export const teamMemberRepository = {
  findDirectory(slug: string, publishedOnly: boolean) {
    return prisma.teamDirectory.findFirst({
      where: {
        slug,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      select: { id: true, slug: true },
    });
  },

  findMembers(input: {
    directoryId: string;
    publishedOnly: boolean;
    departmentId?: string;
    limit?: number;
  }) {
    return prisma.teamMember.findMany({
      where: {
        directoryId: input.directoryId,
        ...(input.publishedOnly ? { isPublished: true } : {}),
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
      orderBy: { sortOrder: "asc" },
      take: input.limit && input.limit > 0 ? input.limit : undefined,
    });
  },

  findMemberById(id: string) {
    return prisma.teamMember.findUnique({
      where: { id },
      include: { directory: { select: { slug: true, isPublished: true } } },
    });
  },

  findDepartments(directoryId: string) {
    return prisma.teamDepartment.findMany({
      where: { directoryId },
      orderBy: { sortOrder: "asc" },
    });
  },
};
