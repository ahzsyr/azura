import "server-only";

import { prisma } from "@/lib/prisma";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import {
  type AccountRequestListItem,
  isLeadQuoteTemplate,
  mapFormStatusForCustomer,
  mapInquiryStatusForCustomer,
  mergeRequestItems,
  ownsFormSubmission,
  sanitizeQuotePayload,
} from "@/features/account/account-requests.helpers";

export async function listAccountRequests(input: {
  userId: string;
  userEmail: string;
  take?: number;
  skip?: number;
}): Promise<{ requests: AccountRequestListItem[]; total: number }> {
  const take = Math.min(input.take ?? 50, 100);
  const skip = Math.max(input.skip ?? 0, 0);

  const [inquiries, submissions] = await Promise.all([
    prisma.inquiry.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        contentItemId: true,
        contentItem: { select: { id: true, slug: true } },
      },
    }),
    prisma.formSubmission.findMany({
      where: {
        OR: [
          { customerId: input.userId },
          { customerId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        payload: true,
        customerId: true,
        createdAt: true,
        updatedAt: true,
        template: { select: { name: true, slug: true, category: true } },
      },
    }),
  ]);

  const itemIds = inquiries
    .map((i) => i.contentItem?.id)
    .filter((id): id is string => Boolean(id));
  const translations = await loadTranslationsMap("ContentItem", itemIds);

  const inquiryItems: AccountRequestListItem[] = inquiries.map((inquiry) => {
    const item = inquiry.contentItem;
    let title: string | undefined;
    if (item) {
      const rowTranslations = translations.get(item.id) ?? [];
      title = localizedFieldValue(rowTranslations, "title") || undefined;
    }
    return {
      id: inquiry.id,
      kind: "inquiry" as const,
      label: title ? `${inquiry.type} · ${title}` : inquiry.type,
      status: mapInquiryStatusForCustomer(inquiry.status),
      summary: inquiry.message.slice(0, 240),
      createdAt: inquiry.createdAt.toISOString(),
      updatedAt: inquiry.updatedAt.toISOString(),
      linkedContent: item
        ? { id: item.id, slug: item.slug, title }
        : null,
    };
  });

  const quoteItems: AccountRequestListItem[] = submissions
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
    .map((row) => {
      const payload = sanitizeQuotePayload(
        row.payload && typeof row.payload === "object"
          ? (row.payload as Record<string, unknown>)
          : {},
      );
      const details =
        typeof payload.details === "string"
          ? payload.details
          : typeof payload.message === "string"
            ? payload.message
            : "";
      return {
        id: row.id,
        kind: "quote" as const,
        label: row.template?.name ?? "Quote request",
        status: mapFormStatusForCustomer(row.status),
        summary: String(details).slice(0, 240),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        linkedContent: null,
      };
    });

  const merged = mergeRequestItems([...inquiryItems, ...quoteItems]);
  const total = merged.length;
  return { requests: merged.slice(skip, skip + take), total };
}

export async function getAccountRequestDetail(input: {
  userId: string;
  userEmail: string;
  id: string;
  kind: "inquiry" | "quote";
}) {
  if (input.kind === "inquiry") {
    const inquiry = await prisma.inquiry.findFirst({
      where: { id: input.id, userId: input.userId },
      select: {
        id: true,
        type: true,
        message: true,
        status: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
        contentItem: { select: { id: true, slug: true } },
      },
    });
    if (!inquiry) return null;
    let title: string | undefined;
    if (inquiry.contentItem) {
      const translations = await loadTranslationsMap("ContentItem", [inquiry.contentItem.id]);
      const rowTranslations = translations.get(inquiry.contentItem.id) ?? [];
      title = localizedFieldValue(rowTranslations, "title") || undefined;
    }
    return {
      kind: "inquiry" as const,
      id: inquiry.id,
      type: inquiry.type,
      message: inquiry.message,
      status: mapInquiryStatusForCustomer(inquiry.status),
      locale: inquiry.locale,
      createdAt: inquiry.createdAt.toISOString(),
      updatedAt: inquiry.updatedAt.toISOString(),
      linkedContent: inquiry.contentItem
        ? { id: inquiry.contentItem.id, slug: inquiry.contentItem.slug, title }
        : null,
    };
  }

  const submission = await prisma.formSubmission.findFirst({
    where: { id: input.id },
    select: {
      id: true,
      status: true,
      payload: true,
      customerId: true,
      createdAt: true,
      updatedAt: true,
      locale: true,
      template: { select: { name: true, slug: true, category: true } },
    },
  });
  if (!submission) return null;
  if (
    !ownsFormSubmission({
      customerId: submission.customerId,
      userId: input.userId,
      userEmail: input.userEmail,
      payload: submission.payload,
    })
  ) {
    return null;
  }
  if (
    !isLeadQuoteTemplate({
      category: submission.template?.category,
      slug: submission.template?.slug,
    })
  ) {
    return null;
  }

  return {
    kind: "quote" as const,
    id: submission.id,
    label: submission.template?.name ?? "Quote request",
    status: mapFormStatusForCustomer(submission.status),
    locale: submission.locale,
    payload: sanitizeQuotePayload(
      submission.payload && typeof submission.payload === "object"
        ? (submission.payload as Record<string, unknown>)
        : {},
    ),
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  };
}
