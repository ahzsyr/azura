"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { EntityTranslation } from "@prisma/client";
import { DEFAULT_ADMIN_LOCALE, type PublicLocale } from "@/i18n/locale-config";
import { upsertTranslationsAction } from "@/features/translation/actions";
import { translationsToFieldValues } from "@/features/translation/block-translation";
import type { EntityTranslationInput } from "@/features/translation/types";
import {
  buildWorkspaceOverrideKey,
  workspaceEntityKey,
  workspaceOverrideMapToInputs,
} from "@/features/translation/workspace-translation-keys";

export type WorkspaceLegacyPropUpdate = (
  entityType: string,
  entityId: string,
  field: string,
  localeCode: string,
  value: string,
) => void;

type WorkspaceTranslationContextValue = {
  locales: PublicLocale[];
  defaultLocaleCode: string;
  getFieldValues: (
    entityType: string,
    entityId: string,
    field: string,
  ) => Record<string, { value: string; status?: EntityTranslation["status"] }>;
  setFieldValue: (
    entityType: string,
    entityId: string,
    field: string,
    localeCode: string,
    value: string,
  ) => void;
  duplicateFromDefault: (
    entityType: string,
    entityId: string,
    field: string,
    targetCode: string,
  ) => void;
  getSerializedInputs: () => EntityTranslationInput[];
  flushTranslations: () => Promise<void>;
  hasPendingTranslations: boolean;
};

const WorkspaceTranslationContext = createContext<WorkspaceTranslationContextValue | null>(null);

export function useWorkspaceTranslations() {
  const ctx = useContext(WorkspaceTranslationContext);
  if (!ctx) {
    throw new Error("useWorkspaceTranslations must be used within WorkspaceTranslationProvider");
  }
  return ctx;
}

export function useWorkspaceTranslationsOptional() {
  return useContext(WorkspaceTranslationContext);
}

function indexTranslationsByEntity(rows: EntityTranslation[]): Map<string, EntityTranslation[]> {
  const map = new Map<string, EntityTranslation[]>();
  for (const row of rows) {
    const key = workspaceEntityKey(row.entityType, row.entityId);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

type ProviderProps = {
  children: ReactNode;
  locales: PublicLocale[];
  initialRows?: EntityTranslation[];
  onLegacyPropUpdate?: WorkspaceLegacyPropUpdate;
  onTranslationDirty?: () => void;
  flushRef?: MutableRefObject<(() => Promise<void>) | null>;
  serializedInputsRef?: MutableRefObject<(() => EntityTranslationInput[]) | null>;
};

export function WorkspaceTranslationProvider({
  children,
  locales,
  initialRows = [],
  onLegacyPropUpdate,
  onTranslationDirty,
  flushRef,
  serializedInputsRef,
}: ProviderProps) {
  const defaultLocaleCode =
    locales.find((l) => l.isDefault)?.code ?? locales[0]?.code ?? DEFAULT_ADMIN_LOCALE.code;

  const [translationIndex, setTranslationIndex] = useState(() =>
    indexTranslationsByEntity(initialRows),
  );
  const [overrides, setOverrides] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    setTranslationIndex(indexTranslationsByEntity(initialRows));
    setOverrides(new Map());
  }, [initialRows]);

  const getFieldValues = useCallback(
    (entityType: string, entityId: string, field: string) => {
      const rows = translationIndex.get(workspaceEntityKey(entityType, entityId)) ?? [];
      const base = translationsToFieldValues(rows, field);
      const merged = { ...base };
      for (const locale of locales) {
        const key = buildWorkspaceOverrideKey(entityType, entityId, field, locale.code);
        if (overrides.has(key)) {
          merged[locale.code] = { value: overrides.get(key)!, status: "PUBLISHED" };
        }
      }
      return merged;
    },
    [translationIndex, overrides, locales],
  );

  const setFieldValue = useCallback(
    (
      entityType: string,
      entityId: string,
      field: string,
      localeCode: string,
      value: string,
    ) => {
      const key = buildWorkspaceOverrideKey(entityType, entityId, field, localeCode);
      setOverrides((prev) => {
        const next = new Map(prev);
        if (value.trim()) next.set(key, value);
        else next.delete(key);
        return next;
      });
      onLegacyPropUpdate?.(entityType, entityId, field, localeCode, value);
      onTranslationDirty?.();
    },
    [onLegacyPropUpdate, onTranslationDirty],
  );

  const duplicateFromDefault = useCallback(
    (entityType: string, entityId: string, field: string, targetCode: string) => {
      const values = getFieldValues(entityType, entityId, field);
      const source = values[defaultLocaleCode]?.value ?? "";
      if (source) setFieldValue(entityType, entityId, field, targetCode, source);
    },
    [getFieldValues, defaultLocaleCode, setFieldValue],
  );

  const getSerializedInputs = useCallback(
    (): EntityTranslationInput[] => workspaceOverrideMapToInputs(overrides),
    [overrides],
  );

  const commitOverridesToIndex = useCallback((inputs: EntityTranslationInput[]) => {
    if (inputs.length === 0) return;
    setTranslationIndex((prev) => {
      const next = new Map(prev);
      for (const input of inputs) {
        const key = workspaceEntityKey(input.entityType, input.entityId);
        const rows = [...(next.get(key) ?? [])];
        const idx = rows.findIndex(
          (r) => r.field === input.field && r.localeCode === input.localeCode,
        );
        const row: EntityTranslation = {
          id: idx >= 0 ? rows[idx]!.id : `pending-${key}-${input.field}-${input.localeCode}`,
          entityType: input.entityType,
          entityId: input.entityId,
          field: input.field,
          localeCode: input.localeCode,
          value: input.value,
          status: input.status ?? "PUBLISHED",
          version: idx >= 0 ? rows[idx]!.version : 1,
          createdAt: idx >= 0 ? rows[idx]!.createdAt : new Date(),
          updatedAt: new Date(),
        };
        if (idx >= 0) rows[idx] = row;
        else rows.push(row);
        next.set(key, rows);
      }
      return next;
    });
    setOverrides(new Map());
  }, []);

  const flushTranslations = useCallback(async () => {
    const inputs = getSerializedInputs();
    if (inputs.length === 0) return;
    const result = await upsertTranslationsAction(inputs);
    if (result.verifiedCount < inputs.length) {
      throw new Error(
        `Translation verification failed (${result.verifiedCount}/${inputs.length} verified).`,
      );
    }
    commitOverridesToIndex(inputs);
  }, [getSerializedInputs, commitOverridesToIndex]);

  useEffect(() => {
    if (!flushRef) return;
    flushRef.current = flushTranslations;
    return () => {
      flushRef.current = null;
    };
  }, [flushTranslations, flushRef]);

  useEffect(() => {
    if (!serializedInputsRef) return;
    serializedInputsRef.current = getSerializedInputs;
    return () => {
      serializedInputsRef.current = null;
    };
  }, [getSerializedInputs, serializedInputsRef]);

  const value = useMemo(
    (): WorkspaceTranslationContextValue => ({
      locales,
      defaultLocaleCode,
      getFieldValues,
      setFieldValue,
      duplicateFromDefault,
      getSerializedInputs,
      flushTranslations,
      hasPendingTranslations: overrides.size > 0,
    }),
    [
      locales,
      defaultLocaleCode,
      getFieldValues,
      setFieldValue,
      duplicateFromDefault,
      getSerializedInputs,
      flushTranslations,
      overrides.size,
    ],
  );

  return (
    <WorkspaceTranslationContext.Provider value={value}>{children}</WorkspaceTranslationContext.Provider>
  );
}
