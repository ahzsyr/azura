import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InquiryDetailPage } from "@/features/catalog/admin/inquiry-detail-page";

export default async function InquiryDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let inquiry = null;

  try {
    inquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        contentItem: { select: { id: true, titleEn: true, slug: true, contentTypeId: true } },
      },
    });
  } catch {
    // DB not connected
  }

  if (!inquiry) notFound();

  return (
    <div>
      <Link href="/admin/inquiries" className="text-sm text-muted-foreground hover:text-primary">
        ← Back to inquiries
      </Link>
      <div className="mt-4">
        <InquiryDetailPage inquiry={inquiry} />
      </div>
    </div>
  );
}
