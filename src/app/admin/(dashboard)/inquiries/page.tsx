import { prisma } from "@/lib/prisma";
import { InquiriesListPage } from "@/features/catalog/admin/inquiries-list-page";

export default async function AdminInquiriesPage() {
  let inquiries: Awaited<
    ReturnType<
      typeof prisma.inquiry.findMany<{
        include: {
          contentItem: { select: { id: true; titleEn: true; slug: true; contentTypeId: true } };
        };
      }>
    >
  > = [];

  try {
    inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contentItem: { select: { id: true, titleEn: true, slug: true, contentTypeId: true } },
      },
    });
  } catch {
    // DB not connected
  }

  return <InquiriesListPage inquiries={inquiries} />;
}
