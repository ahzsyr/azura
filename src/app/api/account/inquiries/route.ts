import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const skip = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  const [inquiries, total] = await Promise.all([
    prisma.inquiry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        type: true,
        name: true,
        email: true,
        message: true,
        status: true,
        locale: true,
        createdAt: true,
        contentItemId: true,
        contentItem: {
          select: { id: true, slug: true },
        },
      },
    }),
    prisma.inquiry.count({ where: { userId: session.user.id } }),
  ]);

  const itemIds = inquiries
    .map((i) => i.contentItem?.id)
    .filter((id): id is string => Boolean(id));
  const translations = await loadTranslationsMap("ContentItem", itemIds);
  const enriched = inquiries.map((inquiry) => {
    const item = inquiry.contentItem;
    if (!item) return inquiry;
    const rowTranslations = translations.get(item.id) ?? [];
    const ctx = { translations: rowTranslations };
    return {
      ...inquiry,
      contentItem: {
        ...item,
        titleEn: localizedFieldValue(rowTranslations, "title"),
        titleAr: resolveTranslation("title", "ar", ctx),
      },
    };
  });

  return NextResponse.json({ inquiries: enriched, total });
}
