import { prisma } from "@/lib/prisma";
import { ContentTypesListPage } from "@/features/content/admin/content-type-form";

export const dynamic = "force-dynamic";

export default async function AdminContentTypesPage() {
  const types = await prisma.contentType.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return <ContentTypesListPage types={types} />;
}
