import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cmsRepository } from "@/repositories/cms.repository";
import { previewTokenService } from "@/features/preview/preview-token.service";
import type { PageBlocks } from "@/types/builder";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pageId, locale = "en" } = (await request.json()) as {
      pageId?: string;
      locale?: string;
    };
    if (!pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    const page = await cmsRepository.getPageById(pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const token = await previewTokenService.create({
      pageId: page.id,
      slug: page.slug,
      blocks: (page.blocks as PageBlocks) ?? [],
      locale,
    });

    const url = `/preview/page?token=${token}&editor=1&locale=${locale}`;
    return NextResponse.json({ token, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create preview token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
