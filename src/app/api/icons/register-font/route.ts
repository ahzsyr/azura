import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { registerFontLibrary } from "@/features/icons/actions";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      fontFamily?: string;
      cssClass?: string;
      mediaId?: string | null;
      glyphs?: Array<{
        name: string;
        glyph: string;
        unicode?: string;
        glyphKey?: string;
        category?: string;
      }>;
    };

    if (!body.name?.trim() || !body.slug?.trim() || !body.fontFamily?.trim()) {
      return NextResponse.json(
        { error: "name, slug, and fontFamily are required" },
        { status: 400 },
      );
    }
    if (!Array.isArray(body.glyphs) || body.glyphs.length === 0) {
      return NextResponse.json({ error: "At least one glyph is required" }, { status: 400 });
    }

    const result = await registerFontLibrary({
      name: body.name,
      slug: body.slug,
      fontFamily: body.fontFamily,
      cssClass: body.cssClass,
      mediaId: body.mediaId ?? null,
      glyphs: body.glyphs,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Registration failed" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[icons/register-font]", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
