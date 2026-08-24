"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TranslationStatus } from "@prisma/client";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { upsertTranslationAction } from "@/features/translation/actions";
import { useEntityTranslations } from "./use-entity-translations";

type UseLocalizedFieldOptions = {
  entityType: string;
  entityId: string | undefined;
  field: string;
  /** When omitted, uses AdminEditingLocaleProvider active locale */
  localeCode?: string;
  autoSave?: boolean;
  debounceMs?: number;
};

export function useLocalizedField({
  entityType,
  entityId,
  field,
  localeCode: localeCodeProp,
  autoSave = false,
  debounceMs = 600,
}: UseLocalizedFieldOptions) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeLocaleCode = localeCodeProp ?? adminLocale?.activeLocaleCode ?? "en";
  const defaultCode = adminLocale?.defaultCode ?? "en";

  const { translations, loading, reload, setFieldValue, getFieldValue } = useEntityTranslations(
    entityType,
    entityId
  );

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = getFieldValue(field, activeLocaleCode);
  const status = translations[field]?.[activeLocaleCode]?.status;

  const save = useCallback(
    async (nextValue?: string, nextStatus: TranslationStatus = "PUBLISHED") => {
      if (!entityId) return { success: false as const, error: "Missing entity id" };
      const payload = nextValue ?? getFieldValue(field, activeLocaleCode);
      setSaving(true);
      setError(null);
      try {
        const result = await upsertTranslationAction({
          entityType,
          entityId,
          field,
          localeCode: activeLocaleCode,
          value: payload,
          status: nextStatus,
        });
        if (!result.success) {
          setError("Save failed");
          return result;
        }
        setFieldValue(field, activeLocaleCode, payload, nextStatus);
        setDirty(false);
        return result;
      } finally {
        setSaving(false);
      }
    },
    [entityType, entityId, field, activeLocaleCode, getFieldValue, setFieldValue]
  );

  const onChange = useCallback(
    (next: string) => {
      setFieldValue(field, activeLocaleCode, next);
      setDirty(true);
      if (autoSave && entityId) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void save(next);
        }, debounceMs);
      }
    },
    [activeLocaleCode, autoSave, debounceMs, entityId, field, save, setFieldValue]
  );

  const clear = useCallback(async () => {
    if (!entityId) return;
    setSaving(true);
    try {
      await upsertTranslationAction({
        entityType,
        entityId,
        field,
        localeCode: activeLocaleCode,
        value: "",
        status: "PUBLISHED",
      });
      setFieldValue(field, activeLocaleCode, "");
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [activeLocaleCode, entityId, entityType, field, setFieldValue]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const englishFallback = useMemo(
    () => getFieldValue(field, defaultCode),
    [defaultCode, field, getFieldValue, translations]
  );

  return {
    value,
    status,
    loading,
    dirty,
    saving,
    error,
    activeLocaleCode,
    defaultCode,
    englishFallback,
    onChange,
    save,
    clear,
    reload,
  };
}
