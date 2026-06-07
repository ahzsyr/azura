import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";
import type { Collection } from "@/features/collections/types";
import {
  syncCollections,
  validateSync,
} from "@/features/collections/collection-sync.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { CATALOG_LOCALES, isCatalogLocale } from "@/features/catalog/locales";

const COLLECTIONS_PATH = resolve(process.cwd(), "src/data/collections.json");
const DATA_DIR = resolve(process.cwd(), "src/data");

async function readCollections(): Promise<Collection[]> {
  try {
    const raw = JSON.parse(await readFile(COLLECTIONS_PATH, "utf-8"));
    return Array.isArray(raw) ? (raw as Collection[]) : [];
  } catch {
    return [];
  }
}

async function writeCollections(data: Collection[]): Promise<void> {
  await writeFile(COLLECTIONS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function slugSet(cols: Array<{ slug?: string }>): Set<string> {
  return new Set(cols.map((c) => c.slug).filter(Boolean) as string[]);
}

function resolveParentSlug(
  cols: Array<{ slug: string; parentSlug?: string }>,
  selfSlug: string,
  parentRaw: unknown,
): string | undefined {
  if (parentRaw == null || parentRaw === "") return undefined;
  const p = String(parentRaw).trim();
  if (!p) return undefined;
  if (p === selfSlug) throw new Error("Collection cannot be its own parent");
  if (!slugSet(cols).has(p)) throw new Error(`Parent collection "${p}" does not exist`);
  let cur: string | undefined = p;
  const seen = new Set<string>();
  while (cur) {
    if (cur === selfSlug) throw new Error("Invalid parent: would create a cycle");
    if (seen.has(cur)) break;
    seen.add(cur);
    const row = cols.find((c) => c.slug === cur);
    cur = row?.parentSlug?.trim() || undefined;
  }
  return p;
}

async function syncLocaleCollectionFile(col: Collection): Promise<void> {
  for (const locale of CATALOG_LOCALES) {
    const dir = join(DATA_DIR, locale, "collections");
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${col.slug}.json`);
    await writeFile(
      filePath,
      JSON.stringify({ ...col, _locale: locale }, null, 2),
      "utf-8",
    );
  }
}

export async function GET() {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;
  const collections = await readCollections();
  return NextResponse.json({ collections });
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "rebuild") {
      const locale = String(body.locale || "en-us").toLowerCase();
      const report = await syncCollections({
        locale: isCatalogLocale(locale) ? locale : "en-us",
        autoCreate: body.autoCreate === true,
      });
      return NextResponse.json({ report });
    }

    if (body.action === "validate") {
      const locale = String(body.locale || "en-us").toLowerCase();
      const report = await validateSync(isCatalogLocale(locale) ? locale : "en-us");
      return NextResponse.json({ report });
    }

    if (!body.slug || !body.name) {
      return NextResponse.json({ error: "slug and name are required" }, { status: 400 });
    }

    const cols = await readCollections();
    if (cols.find((c) => c.slug === body.slug)) {
      return NextResponse.json({ error: "A collection with this slug already exists" }, { status: 400 });
    }

    const parentSlug = resolveParentSlug(
      cols.map((c) => ({ slug: c.slug, parentSlug: c.parentSlug })),
      String(body.slug),
      body.parentSlug,
    );

    const now = new Date().toISOString();
    const col: Collection = {
      id: String(body.slug),
      slug: String(body.slug),
      name: String(body.name),
      description: String(body.description ?? ""),
      badge: String(body.badge ?? ""),
      coverImage: String(body.coverImage ?? ""),
      iconImage: body.iconImage ? String(body.iconImage) : undefined,
      parentSlug,
      seo: (body.seo as Collection["seo"]) ?? {},
      conditions: (body.conditions as Collection["conditions"]) ?? { match: "any", rules: [] },
      cardTemplate: (body.cardTemplate as Collection["cardTemplate"]) ?? "default",
      sortBy: (body.sortBy as Collection["sortBy"]) ?? "name-asc",
      visible: body.visible !== false,
      showInNav: Boolean(body.showInNav),
      featured: Boolean(body.featured),
      tags: (body.tags as string[]) ?? [],
      createdAt: String(body.createdAt ?? now),
      updatedAt: now,
    };

    cols.push(col);
    await writeCollections(cols);
    await syncLocaleCollectionFile(col);
    return NextResponse.json({ collection: col });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as Record<string, unknown> & {
      originalSlug?: string;
      slug?: string;
      id?: string;
    };
    if (!body.slug && !body.id && !body.originalSlug) {
      return NextResponse.json({ error: "slug or id required" }, { status: 400 });
    }

    const cols = await readCollections();
    const key = body.originalSlug ?? body.id ?? body.slug;
    const idx = cols.findIndex((c) => c.slug === key || c.id === key);
    if (idx === -1) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const nextSlug = String(body.slug ?? cols[idx].slug);
    const duplicate = cols.find((c, i) => i !== idx && (c.slug === nextSlug || c.id === nextSlug));
    if (duplicate) {
      return NextResponse.json({ error: "A collection with this slug already exists" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const merged = {
      ...cols[idx],
      ...body,
      id: nextSlug,
      slug: nextSlug,
      updatedAt: now,
    } as Collection;
    delete (merged as { originalSlug?: string }).originalSlug;

    cols[idx] = merged;
    await writeCollections(cols);
    await syncLocaleCollectionFile(merged);
    return NextResponse.json({ collection: merged });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { slug?: string; id?: string };
    const key = body.slug ?? body.id;
    if (!key) {
      return NextResponse.json({ error: "slug or id required" }, { status: 400 });
    }

    const cols = await readCollections();
    if (!cols.find((c) => c.slug === key || c.id === key)) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const next = cols.filter((c) => c.slug !== key && c.id !== key);
    await writeCollections(next);
    return NextResponse.json({ removedSlug: key });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 400 },
    );
  }
}
