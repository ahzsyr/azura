import { prisma } from "@/lib/prisma";
import { isPostgresDatabaseUrl } from "@/lib/database-url";
import { Prisma } from "@prisma/client";
import type { SearchEntityType } from "@prisma/client";
import { purgeInvalidSearchDocuments } from "@/features/search-framework/indexer/purge-invalid-search-documents";
import { SEARCH_PERF_LIMITS } from "@/features/search-framework/performance/search-performance-limits";
import { toBooleanModeQuery, tokenize } from "@/features/search/search-text";

/** Row returned from list queries — body is a short preview, not full indexed text. */
export type SearchRow = {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  locale: string;
  title: string;
  body: string;
  urlPath: string;
  metadata: unknown;
  relevance?: number;
};

const BODY_PREVIEW = SEARCH_PERF_LIMITS.maxSnippetSourceChars;

const leanSelect = {
  id: true,
  entityType: true,
  entityId: true,
  locale: true,
  title: true,
  urlPath: true,
  metadata: true,
} as const;

function mapLeanRow(
  row: {
    id: string;
    entityType: SearchEntityType;
    entityId: string;
    locale: string;
    title: string;
    urlPath: string;
    metadata: unknown;
    body?: string;
  },
  relevance?: number
): SearchRow {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const preview =
    typeof row.body === "string" && row.body
      ? row.body
      : typeof meta.indexExcerpt === "string"
        ? meta.indexExcerpt
        : "";
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    locale: row.locale,
    title: row.title,
    body: preview,
    urlPath: row.urlPath,
    metadata: row.metadata,
    relevance,
  };
}

type FullTextRow = {
  id: string;
  entityType: SearchEntityType;
  entityId: string;
  locale: string;
  title: string;
  body: string;
  urlPath: string;
  metadata: unknown;
  relevance: number;
};

function toPostgresTsQuery(tokens: string[]): string {
  return tokens.join(" ");
}

async function mysqlFullTextSearch(params: {
  locale: string;
  types?: SearchEntityType[];
  limit: number;
  booleanQ: string;
}): Promise<FullTextRow[]> {
  if (params.types?.length) {
    return prisma.$queryRaw<FullTextRow[]>`
      SELECT id, entityType, entityId, locale, title, urlPath, metadata,
        SUBSTRING(body, 1, ${BODY_PREVIEW}) AS body,
        MATCH(title, body) AGAINST (${params.booleanQ} IN BOOLEAN MODE) AS relevance
      FROM SearchDocument
      WHERE locale = ${params.locale}
        AND entityType IN (${Prisma.join(params.types)})
        AND MATCH(title, body) AGAINST (${params.booleanQ} IN BOOLEAN MODE)
      ORDER BY relevance DESC
      LIMIT ${params.limit}
    `;
  }

  return prisma.$queryRaw<FullTextRow[]>`
    SELECT id, entityType, entityId, locale, title, urlPath, metadata,
      SUBSTRING(body, 1, ${BODY_PREVIEW}) AS body,
      MATCH(title, body) AGAINST (${params.booleanQ} IN BOOLEAN MODE) AS relevance
    FROM SearchDocument
    WHERE locale = ${params.locale}
      AND MATCH(title, body) AGAINST (${params.booleanQ} IN BOOLEAN MODE)
    ORDER BY relevance DESC
    LIMIT ${params.limit}
  `;
}

async function postgresFullTextSearch(params: {
  locale: string;
  types?: SearchEntityType[];
  limit: number;
  tsQuery: string;
}): Promise<FullTextRow[]> {
  if (params.types?.length) {
    return prisma.$queryRaw<FullTextRow[]>`
      SELECT id, "entityType", "entityId", locale, title, "urlPath", metadata,
        LEFT(body, ${BODY_PREVIEW}) AS body,
        ts_rank(
          to_tsvector('simple', title || ' ' || body),
          plainto_tsquery('simple', ${params.tsQuery})
        ) AS relevance
      FROM "SearchDocument"
      WHERE locale = ${params.locale}
        AND "entityType" IN (${Prisma.join(params.types)})
        AND to_tsvector('simple', title || ' ' || body) @@ plainto_tsquery('simple', ${params.tsQuery})
      ORDER BY relevance DESC
      LIMIT ${params.limit}
    `;
  }

  return prisma.$queryRaw<FullTextRow[]>`
    SELECT id, "entityType", "entityId", locale, title, "urlPath", metadata,
      LEFT(body, ${BODY_PREVIEW}) AS body,
      ts_rank(
        to_tsvector('simple', title || ' ' || body),
        plainto_tsquery('simple', ${params.tsQuery})
      ) AS relevance
    FROM "SearchDocument"
    WHERE locale = ${params.locale}
      AND to_tsvector('simple', title || ' ' || body) @@ plainto_tsquery('simple', ${params.tsQuery})
    ORDER BY relevance DESC
    LIMIT ${params.limit}
  `;
}

export const searchRepository = {
  async fullTextSearch(params: {
    q: string;
    locale: string;
    types?: SearchEntityType[];
    limit: number;
    tokens?: string[];
  }): Promise<SearchRow[]> {
    const tokens = params.tokens?.length ? params.tokens : tokenize(params.q);
    if (!tokens.length) return [];

    const limit = Math.min(params.limit, SEARCH_PERF_LIMITS.maxRetrievalCandidates);
    const usePostgres = isPostgresDatabaseUrl();

    try {
      const rows = usePostgres
        ? await postgresFullTextSearch({
            locale: params.locale,
            types: params.types,
            limit,
            tsQuery: toPostgresTsQuery(tokens),
          })
        : await mysqlFullTextSearch({
            locale: params.locale,
            types: params.types,
            limit,
            booleanQ: toBooleanModeQuery(tokens),
          });

      return rows.map((r) => mapLeanRow(r, Number(r.relevance) || 0));
    } catch {
      return [];
    }
  },

  async likeSearch(params: {
    q: string;
    locale: string;
    types?: SearchEntityType[];
    limit: number;
    tokens?: string[];
    multiKeywordMode?: "all" | "any";
  }): Promise<SearchRow[]> {
    const tokens =
      params.tokens?.map((t) => t.trim()).filter((t) => t.length > 0) ??
      tokenize(params.q);
    const mode = params.multiKeywordMode ?? "any";

    if (!tokens.length) return [];

    const tokenClause = (tok: string) => ({
      OR: [{ title: { contains: tok } }, { body: { contains: tok } }],
    });

    const textFilter =
      tokens.length === 1
        ? tokenClause(tokens[0]!)
        : mode === "all"
          ? { AND: tokens.map(tokenClause) }
          : { OR: tokens.map(tokenClause) };

    const limit = Math.min(params.limit, SEARCH_PERF_LIMITS.maxRetrievalCandidates);

    const rows = await prisma.searchDocument.findMany({
      where: {
        locale: params.locale,
        ...(params.types?.length ? { entityType: { in: params.types } } : {}),
        ...textFilter,
      },
      select: {
        ...leanSelect,
        body: true,
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((r) => {
      const body =
        r.body.length > BODY_PREVIEW ? r.body.slice(0, BODY_PREVIEW) : r.body;
      return mapLeanRow({ ...r, body });
    });
  },

  async prefixSuggestions(params: {
    q: string;
    locale: string;
    limit: number;
  }) {
    return prisma.searchDocument.findMany({
      where: {
        locale: params.locale,
        OR: [
          { title: { startsWith: params.q } },
          { title: { contains: ` ${params.q}` } },
        ],
      },
      take: Math.min(params.limit, 20),
      select: {
        title: true,
        urlPath: true,
        entityType: true,
        entityId: true,
        metadata: true,
      },
      orderBy: { title: "asc" },
    });
  },

  async documentCount(locale?: string) {
    return prisma.searchDocument.count({
      where: locale ? { locale } : undefined,
    });
  },

  async documentCountByEntityType(locale?: string): Promise<Record<string, number>> {
    await purgeInvalidSearchDocuments();
    const rows = await prisma.searchDocument.groupBy({
      by: ["entityType"],
      where: locale ? { locale } : undefined,
      _count: { _all: true },
    });
    const out: Record<string, number> = {};
    for (const row of rows) {
      out[row.entityType] = row._count._all;
    }
    return out;
  },
};
