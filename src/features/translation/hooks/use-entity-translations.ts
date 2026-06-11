"use client";

import { useCallback, useEffect, useState } from "react";
import type { EntityTranslation, TranslationStatus } from "@prisma/client";
import { getEntityTranslationsAction } from "@/features/translation/actions";

export type FieldTranslationMap = Record<
  string,
  Record<string, { value: string; status: TranslationStatus }>
>;

function indexTranslations(rows: EntityTranslation[]): FieldTranslationMap {
  const map: FieldTranslationMap = {};
  for (const row of rows) {
    if (!map[row.field]) map[row.field] = {};
    map[row.field][row.languageCode] = { value: row.value, status: row.status };
  }
  return map;
}

export function useEntityTranslations(entityType: string, entityId: string | undefined) {
  const [translations, setTranslations] = useState<FieldTranslationMap>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!entityId) {
      setTranslations({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await getEntityTranslationsAction(entityType, entityId);
      setTranslations(indexTranslations(rows));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setFieldValue = useCallback(
    (field: string, languageCode: string, value: string, status: TranslationStatus = "PUBLISHED") => {
      setTranslations((prev) => ({
        ...prev,
        [field]: {
          ...prev[field],
          [languageCode]: { value, status },
        },
      }));
    },
    []
  );

  const getFieldValue = useCallback(
    (field: string, languageCode: string) => translations[field]?.[languageCode]?.value ?? "",
    [translations]
  );

  const hasAnyTranslation = Object.values(translations).some((localeMap) =>
    Object.values(localeMap).some((v) => v.value.trim())
  );

  return { translations, loading, reload, setFieldValue, getFieldValue, hasAnyTranslation };
}
