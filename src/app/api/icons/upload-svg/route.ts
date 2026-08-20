import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeUploadedIconSvg } from "@/features/icons/lib/svg-sanitizer";
import { indexIconSearch } from "@/features/icons/lib/index-icon-search";

const ICON_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const iconIdRaw = formData.get("iconId");
    const nameRaw = formData.get("name");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (typeof iconIdRaw !== "string" || !iconIdRaw.trim()) {
      return NextResponse.json({ error: "iconId is required" }, { status: 400 });
    }
    if (typeof nameRaw !== "string" || !nameRaw.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const iconId = iconIdRaw.trim();
    const name = nameRaw.trim();
    if (!ICON_ID_RE.test(iconId)) {
      return NextResponse.json({ error: "iconId must be kebab-case (a-z0-9-)" }, { status: 400 });
    }

    const filename = file.name?.trim() ?? "";
    const extOk = filename.toLowerCase().endsWith(".svg");
    const mimeOk = !file.type || file.type === "image/svg+xml" || file.type === "text/xml";
    if (!extOk || !mimeOk) {
      return NextResponse.json({ error: "Only .svg files are allowed" }, { status: 400 });
    }

    const rawSvg = await file.text();
    const sanitized = sanitizeUploadedIconSvg(rawSvg);
    if (!sanitized) {
      return NextResponse.json({ error: "SVG rejected by sanitizer" }, { status: 400 });
    }

    const p = prisma as any;
    if (!p?.iconAsset?.upsert) {
      return NextResponse.json({ error: "Icons storage not configured" }, { status: 503 });
    }
    await p.iconAsset.upsert({
      where: { id: iconId },
      update: {
        enabled: true,
        source: "CUSTOM",
        type: "SVG",
        name,
        slug: iconId,
        svgContent: sanitized.svgContent,
        viewBox: sanitized.viewBox ?? null,
      },
      create: {
        id: iconId,
        libraryId: null,
        enabled: true,
        source: "CUSTOM",
        type: "SVG",
        name,
        slug: iconId,
        iconName: null,
        svgContent: sanitized.svgContent,
        viewBox: sanitized.viewBox ?? null,
        fontFamily: null,
        glyph: null,
        unicode: null,
        glyphKey: null,
        category: null,
        tags: null,
      },
    });

    await indexIconSearch({
      id: iconId,
      name,
      slug: iconId,
      source: "CUSTOM",
    });

    return NextResponse.json({ ok: true, iconId });
  } catch (error) {
    console.error("[icons/upload-svg]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

