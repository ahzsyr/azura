import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { revalidateContentItemPublicPaths } from "@/features/content/revalidate-content-public";
import { verifyCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";

function authorizedBySecret(request: NextRequest): boolean {
  return verifyCronSecret(request, {
    envKeys: ["CONTENT_REVALIDATE_SECRET", "CRON_SECRET"],
    headerName: "x-content-revalidate-secret",
  });
}

type RevalidateBody = {
  typeSlug?: string;
  routePrefix?: string | null;
  slugs?: string[];
  itemIds?: string[];
};

/**
 * Bust ISR/data caches for content item public pages after CLI migrations or bulk fills.
 * Auth: admin session OR CONTENT_REVALIDATE_SECRET / CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const secretOk = authorizedBySecret(request);
  if (!secretOk) {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const typeSlug = body.typeSlug?.trim();
  if (!typeSlug) {
    return NextResponse.json({ error: "typeSlug is required" }, { status: 400 });
  }

  const slugs = (body.slugs ?? []).map((slug) => slug.trim()).filter(Boolean);
  const itemIds = (body.itemIds ?? []).map((id) => id.trim()).filter(Boolean);

  if (slugs.length === 0 && itemIds.length === 0) {
    const paths = await revalidateContentItemPublicPaths({
      typeSlug,
      routePrefix: body.routePrefix,
    });
    return NextResponse.json({ ok: true, paths });
  }

  const allPaths: string[] = [];
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const paths = await revalidateContentItemPublicPaths({
      typeSlug,
      routePrefix: body.routePrefix,
      slug,
      itemId: itemIds[i],
    });
    allPaths.push(...paths);
  }

  return NextResponse.json({ ok: true, paths: [...new Set(allPaths)] });
}
