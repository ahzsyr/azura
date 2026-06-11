import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InquiryDetailPage } from "@/features/catalog/admin/inquiry-detail-page";

const inquiryInclude = {
  contentItem: { select: { id: true, titleEn: true, slug: true, contentTypeId: true } },
  user: { select: { id: true, email: true, name: true, phone: true } },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
      select: { name: true },
    });
    if (inquiry) return { title: `${inquiry.name} · Inquiry` };
  } catch {
    // ignore
  }
  return { title: "Inquiry" };
}

export default async function InquiryDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let inquiry = null;
  let suggestedCustomer = null;

  try {
    inquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: inquiryInclude,
    });
    if (inquiry && !inquiry.userId) {
      const email = inquiry.email.trim().toLowerCase();
      suggestedCustomer = await prisma.user.findFirst({
        where: { role: "CUSTOMER", email },
        select: { id: true, email: true, name: true, phone: true },
      });
    }
  } catch {
    // DB not connected
  }

  if (!inquiry) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/inquiries" className="text-sm text-muted-foreground hover:text-primary">
        ← Back to inquiries
      </Link>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading inquiry…</div>}>
        <InquiryDetailPage inquiry={inquiry} suggestedCustomer={suggestedCustomer} />
      </Suspense>
    </div>
  );
}
