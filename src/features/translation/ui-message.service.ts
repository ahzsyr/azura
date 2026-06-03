import { prisma } from "@/lib/prisma";
import { revalidateUiMessages } from "@/services/cache";
import type { TranslationStatus } from "@prisma/client";

type NestedDict = Record<string, unknown>;

function setNestedKey(obj: NestedDict, path: string, value: string) {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as NestedDict;
  }
  current[parts[parts.length - 1]] = value;
}

function deepMerge(base: NestedDict, override: NestedDict): NestedDict {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object"
    ) {
      result[key] = deepMerge(result[key] as NestedDict, value as NestedDict);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const uiMessageService = {
  async upsert(
    namespace: string,
    key: string,
    languageCode: string,
    value: string,
    status: TranslationStatus = "PUBLISHED"
  ) {
    const row = await prisma.uiMessage.upsert({
      where: {
        namespace_key_languageCode: { namespace, key, languageCode },
      },
      create: { namespace, key, languageCode, value, status },
      update: { value, status },
    });
    revalidateUiMessages(languageCode);
    return row;
  },

  async upsertMany(
    entries: { namespace: string; key: string; languageCode: string; value: string; status?: TranslationStatus }[]
  ) {
    for (const entry of entries) {
      await this.upsert(entry.namespace, entry.key, entry.languageCode, entry.value, entry.status);
    }
  },

  async getMessagesForLocale(languageCode: string): Promise<NestedDict> {
    const rows = await prisma.uiMessage.findMany({
      where: { languageCode, status: "PUBLISHED" },
    });
    const dict: NestedDict = {};
    for (const row of rows) {
      const fullKey = row.namespace === "root" ? row.key : `${row.namespace}.${row.key}`;
      setNestedKey(dict, fullKey, row.value);
    }
    return dict;
  },

  async getAllGrouped() {
    const rows = await prisma.uiMessage.findMany({
      orderBy: [{ namespace: "asc" }, { key: "asc" }, { languageCode: "asc" }],
    });

    const map = new Map<
      string,
      { namespace: string; key: string; values: Record<string, { value: string; status: TranslationStatus }> }
    >();

    for (const row of rows) {
      const composite = `${row.namespace}:${row.key}`;
      if (!map.has(composite)) {
        map.set(composite, { namespace: row.namespace, key: row.key, values: {} });
      }
      map.get(composite)!.values[row.languageCode] = { value: row.value, status: row.status };
    }

    return [...map.values()];
  },

  async listNamespaces(): Promise<string[]> {
    const rows = await prisma.uiMessage.findMany({
      select: { namespace: true },
      distinct: ["namespace"],
      orderBy: { namespace: "asc" },
    });
    return rows.map((r) => r.namespace);
  },

  async search(query: string, languageCode?: string, limit = 50) {
    return prisma.uiMessage.findMany({
      where: {
        ...(languageCode ? { languageCode } : {}),
        OR: [{ key: { contains: query } }, { value: { contains: query } }],
      },
      take: limit,
      orderBy: [{ namespace: "asc" }, { key: "asc" }],
    });
  },

  async getMissingKeys(sourceCode: string, targetCode: string) {
    const source = await prisma.uiMessage.findMany({ where: { languageCode: sourceCode } });
    const targetKeys = new Set(
      (await prisma.uiMessage.findMany({ where: { languageCode: targetCode } })).map(
        (r) => `${r.namespace}:${r.key}`
      )
    );
    return source.filter((r) => !targetKeys.has(`${r.namespace}:${r.key}`));
  },

  async importFromFlatDict(
    dict: NestedDict,
    languageCode: string,
    namespace = "root"
  ) {
    const entries: { namespace: string; key: string; languageCode: string; value: string }[] = [];

    function walk(obj: NestedDict, prefix: string) {
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string") {
          entries.push({ namespace, key: path, languageCode, value: v });
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
          walk(v as NestedDict, path);
        }
      }
    }

    walk(dict, "");
    await this.upsertMany(entries);
    return entries.length;
  },
};

export async function getMergedMessages(
  languageCode: string,
  fileMessages: NestedDict
): Promise<NestedDict> {
  try {
    const dbMessages = await uiMessageService.getMessagesForLocale(languageCode);
    return deepMerge(fileMessages, dbMessages);
  } catch {
    return fileMessages;
  }
}
