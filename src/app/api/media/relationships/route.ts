import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  id: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse({
      id: searchParams.get("id") ?? undefined,
      url: searchParams.get("url") ?? undefined,
    });
    if (!parsed.id && !parsed.url) {
      return NextResponse.json({ error: "id or url is required" }, { status: 400 });
    }

    const asset = parsed.id
      ? await prisma.mediaAsset.findUnique({ where: { id: parsed.id } })
      : await prisma.mediaAsset.findFirst({ where: { url: parsed.url } });

    if (!asset) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    const usages = await prisma.mediaUsage.findMany({
      where: { mediaId: asset.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      mediaId: asset.id,
      url: asset.url,
      usages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

