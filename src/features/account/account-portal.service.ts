import "server-only";

import { prisma } from "@/lib/prisma";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import {
  buildActivityFromRequests,
  mapFormStatusForCustomer,
  mapInquiryStatusForCustomer,
  ownsFormSubmission,
  isLeadQuoteTemplate,
} from "@/features/account/account-requests.helpers";

export async function listAccountBookings(input: {
  userId: string;
  take?: number;
  skip?: number;
}) {
  const take = Math.min(input.take ?? 50, 100);
  const skip = Math.max(input.skip ?? 0, 0);

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        contentItem: { select: { id: true, slug: true } },
      },
    }),
    prisma.booking.count({ where: { userId: input.userId } }),
  ]);

  const itemIds = rows.map((r) => r.contentItem.id);
  const translations = await loadTranslationsMap("ContentItem", itemIds);

  const bookings = rows.map((row) => {
    const rowTranslations = translations.get(row.contentItem.id) ?? [];
    const title = localizedFieldValue(rowTranslations, "title") || undefined;
    return {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      contentItem: {
        id: row.contentItem.id,
        slug: row.contentItem.slug,
        title,
      },
    };
  });

  return { bookings, total };
}

export async function listAccountActivity(input: {
  userId: string;
  userEmail: string;
  limit?: number;
}) {
  const [inquiries, submissions, bookings] = await Promise.all([
    prisma.inquiry.findMany({
      where: { userId: input.userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, type: true, status: true, updatedAt: true },
    }),
    prisma.formSubmission.findMany({
      where: {
        OR: [{ customerId: input.userId }, { customerId: null }],
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        payload: true,
        customerId: true,
        updatedAt: true,
        template: { select: { name: true, slug: true, category: true } },
      },
    }),
    prisma.booking.findMany({
      where: { userId: input.userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, status: true, updatedAt: true },
    }),
  ]);

  const requestRows = [
    ...inquiries.map((i) => ({
      id: i.id,
      kind: "inquiry" as const,
      label: i.type,
      status: mapInquiryStatusForCustomer(i.status),
      updatedAt: i.updatedAt.toISOString(),
    })),
    ...submissions
      .filter((row) =>
        ownsFormSubmission({
          customerId: row.customerId,
          userId: input.userId,
          userEmail: input.userEmail,
          payload: row.payload,
        }),
      )
      .filter((row) =>
        isLeadQuoteTemplate({
          category: row.template?.category,
          slug: row.template?.slug,
        }),
      )
      .map((row) => ({
        id: row.id,
        kind: "quote" as const,
        label: row.template?.name ?? "Quote request",
        status: mapFormStatusForCustomer(row.status),
        updatedAt: row.updatedAt.toISOString(),
      })),
  ];

  const activity = [
    ...buildActivityFromRequests(requestRows, input.limit ?? 20),
    ...bookings.map((booking) => ({
      id: booking.id,
      kind: "booking" as const,
      label: "Booking interest",
      status: booking.status,
      at: booking.updatedAt.toISOString(),
    })),
  ];

  return activity
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, input.limit ?? 20);
}
