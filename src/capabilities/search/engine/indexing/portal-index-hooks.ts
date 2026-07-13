import "server-only";

import { prisma } from "@/lib/prisma";
import { revalidateSearch } from "@/services/cache";
import { frameworkSearchIndexer } from "@/capabilities/search/engine";

export async function syncTeamDirectorySearchIndex(directoryId: string) {
  const directory = await prisma.teamDirectory.findUnique({
    where: { id: directoryId },
    select: {
      id: true,
      slug: true,
      isPublished: true,
      members: {
        select: {
          id: true,
          directoryId: true,
          departmentId: true,
          email: true,
          phone: true,
          skills: true,
          imageUrl: true,
          isPublished: true,
        },
      },
    },
  });
  if (!directory) return;

  const indexer = frameworkSearchIndexer;
  if (!directory.isPublished) {
    for (const member of directory.members) {
      await indexer.remove("TEAM_MEMBER", member.id, { revalidate: false });
    }
    revalidateSearch();
    return;
  }

  for (const member of directory.members) {
    if (member.isPublished) {
      await indexer.indexTeamMember(
        {
          ...member,
          directorySlug: directory.slug,
        },
        { revalidate: false },
      );
    } else {
      await indexer.remove("TEAM_MEMBER", member.id, { revalidate: false });
    }
  }
  revalidateSearch();
}

export async function removeTeamDirectorySearchIndex(directoryId: string) {
  const members = await prisma.teamMember.findMany({
    where: { directoryId },
    select: { id: true },
  });
  const indexer = frameworkSearchIndexer;
  for (const member of members) {
    await indexer.remove("TEAM_MEMBER", member.id, { revalidate: false });
  }
  revalidateSearch();
}

export async function syncPartnerProgramSearchIndex(programId: string) {
  const program = await prisma.partnerProgram.findUnique({
    where: { id: programId },
    select: {
      id: true,
      slug: true,
      isPublished: true,
      partners: {
        select: {
          id: true,
          programId: true,
          categoryId: true,
          logoUrl: true,
          websiteUrl: true,
          profileUrl: true,
          email: true,
          phone: true,
          certifications: true,
          isPublished: true,
          category: { select: { slug: true } },
        },
      },
    },
  });
  if (!program) return;

  const indexer = frameworkSearchIndexer;
  if (!program.isPublished) {
    for (const partner of program.partners) {
      await indexer.remove("PARTNER", partner.id, { revalidate: false });
    }
    revalidateSearch();
    return;
  }

  for (const partner of program.partners) {
    if (partner.isPublished) {
      await indexer.indexPartner(
        {
          ...partner,
          programSlug: program.slug,
          categorySlug: partner.category?.slug ?? null,
        },
        { revalidate: false },
      );
    } else {
      await indexer.remove("PARTNER", partner.id, { revalidate: false });
    }
  }
  revalidateSearch();
}

export async function removePartnerProgramSearchIndex(programId: string) {
  const partners = await prisma.partner.findMany({
    where: { programId },
    select: { id: true },
  });
  const indexer = frameworkSearchIndexer;
  for (const partner of partners) {
    await indexer.remove("PARTNER", partner.id, { revalidate: false });
  }
  revalidateSearch();
}
