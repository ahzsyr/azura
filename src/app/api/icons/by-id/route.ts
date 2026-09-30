import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const iconId = url.searchParams.get("iconId");
  if (!iconId) {
    return NextResponse.json({ error: "iconId is required" }, { status: 400 });
  }

  try {
    const p = prisma as any;
    if (!p?.iconAsset?.findUnique) {
      return NextResponse.json({ icon: null }, { status: 404 });
    }
    const icon = await p.iconAsset.findUnique({
      where: { id: iconId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        source: true,
        type: true,
        iconName: true,
        svgContent: true,
        viewBox: true,
        fontFamily: true,
        glyph: true,
        unicode: true,
        glyphKey: true,
        enabled: true,
        media: { select: { url: true, mimeType: true } },
        _count: { select: { usages: true } },
      },
    });

    if (!icon || icon.enabled === false) {
      return NextResponse.json({ icon: null }, { status: 404 });
    }

    return NextResponse.json({ icon });
  } catch (error) {
    console.error("[icons/by-id]", error);
    return NextResponse.json({ error: "Failed to load icon" }, { status: 500 });
  }
}

