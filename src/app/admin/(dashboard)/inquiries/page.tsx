import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { InquiriesListPage } from "@/features/catalog/admin/inquiries-list-page";

export const metadata = {
  title: "Inquiries",
};

const inquiryInclude = {
  contentItem: { select: { id: true, slug: true, contentTypeId: true } },
  user: { select: { id: true, email: true, name: true, phone: true } },
} as const;

export default async function AdminInquiriesPage() {
  let inquiries: Awaited<
    ReturnType<typeof prisma.inquiry.findMany<{ include: typeof inquiryInclude }>>
  > = [];

  try {
    inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: inquiryInclude,
    });
  } catch {
    // DB not connected
  }

  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-muted-foreground">Loading inquiries…</div>}
    >
      <InquiriesListPage inquiries={inquiries} />
    </Suspense>
  );
}
