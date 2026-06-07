"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EntityTranslation } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { LocalizedBlockField } from "@/features/translation/components/localized-block-field";
import {
  buildTranslationOverrideKey,
  getTranslatableFieldsForBlockType,
  indexBlockTranslationsByBlockId,
  makeBlockEntityId,
  overrideMapToInputs,
  translationsToFieldValues,
  type BlockParentType,
  type BlockTranslationMap,
} from "@/features/translation/block-translation";
import type { EntityTranslationInput } from "@/features/translation/types";
import type { BlockNode, PageBlocks } from "@/types/builder";

type BlockTranslationContextValue = {
  locales: PublicLocale[];
  defaultLocaleCode: string;
  parentType: BlockParentType | null;
  parentId: string | null;
  translationMap: BlockTranslationMap;
  getFieldValues: (blockId: string, field: string) => Record<string, { value: string; status?: EntityTranslation["status"] }>;
  setFieldValue: (blockId: string, field: string, localeCode: string, value: string) => void;
  duplicateFromDefault: (blockId: string, field: string, targetCode: string) => void;
  getSerializedInputs: () => EntityTranslationInput[];
};

const BlockTranslationContext = createContext<BlockTranslationContextValue | null>(null);

export function useBlockTranslations() {
  const ctx = useContext(BlockTranslationContext);
  if (!ctx) {
    throw new Error("useBlockTranslations must be used within BlockTranslationProvider");
  }
  return ctx;
}

export function useBlockTranslationsOptional() {
  return useContext(BlockTranslationContext);
}

type ProviderProps = {
  children: ReactNode;
  locales: PublicLocale[];
  parentType: BlockParentType | null;
  parentId: string | null;
  initialBlocks?: PageBlocks;
  initialRows?: EntityTranslation[];
  onLegacyPropUpdate?: (
    blockId: string,
    field: string,
    localeCode: string,
    value: string
  ) => void;
};

export function BlockTranslationProvider({
  children,
  locales,
  parentType,
  parentId,
  initialBlocks = [],
  initialRows = [],
  onLegacyPropUpdate,
}: ProviderProps) {
  const defaultLocaleCode = locales.find((l) => l.isDefault)?.code ?? locales[0]?.code ?? "en";

  const [translationMap] = useState<BlockTranslationMap>(() =>
    parentType && parentId
      ? indexBlockTranslationsByBlockId(initialBlocks, parentType, parentId, initialRows)
      : new Map()
  );

  const [overrides, setOverrides] = useState<Map<string, string>>(() => new Map());

  const getEntityId = useCallback(
    (blockId: string) => {
      if (!parentType || !parentId) return null;
      return makeBlockEntityId(parentType, parentId, blockId);
    },
    [parentType, parentId]
  );

  const getFieldValues = useCallback(
    (blockId: string, field: string) => {
      const rows = translationMap.get(blockId) ?? [];
      const base = translationsToFieldValues(rows, field);
      const entityId = getEntityId(blockId);
      if (!entityId) return base;

      const merged = { ...base };
      for (const locale of locales) {
        const key = buildTranslationOverrideKey(entityId, field, locale.code);
        if (overrides.has(key)) {
          merged[locale.code] = { value: overrides.get(key)!, status: "PUBLISHED" };
        }
      }
      return merged;
    },
    [translationMap, overrides, getEntityId, locales]
  );

  const setFieldValue = useCallback(
    (blockId: string, field: string, localeCode: string, value: string) => {
      const entityId = getEntityId(blockId);
      if (!entityId) return;
      const key = buildTranslationOverrideKey(entityId, field, localeCode);
      setOverrides((prev) => {
        const next = new Map(prev);
        if (value.trim()) next.set(key, value);
        else next.delete(key);
        return next;
      });
      onLegacyPropUpdate?.(blockId, field, localeCode, value);
    },
    [getEntityId, onLegacyPropUpdate]
  );

  const duplicateFromDefault = useCallback(
    (blockId: string, field: string, targetCode: string) => {
      const values = getFieldValues(blockId, field);
      const source = values[defaultLocaleCode]?.value ?? "";
      if (source) setFieldValue(blockId, field, targetCode, source);
    },
    [getFieldValues, defaultLocaleCode, setFieldValue]
  );

  const getSerializedInputs = useCallback(
    (): EntityTranslationInput[] => overrideMapToInputs(overrides),
    [overrides]
  );

  const value = useMemo(
    () => ({
      locales,
      defaultLocaleCode,
      parentType,
      parentId,
      translationMap,
      getFieldValues,
      setFieldValue,
      duplicateFromDefault,
      getSerializedInputs,
    }),
    [
      locales,
      defaultLocaleCode,
      parentType,
      parentId,
      translationMap,
      getFieldValues,
      setFieldValue,
      duplicateFromDefault,
      getSerializedInputs,
    ]
  );

  return (
    <BlockTranslationContext.Provider value={value}>{children}</BlockTranslationContext.Provider>
  );
}

function LocalizedBlockFieldWrapper({
  block,
  field,
  label,
  values,
  multiline,
  rows,
}: {
  block: BlockNode;
  field: string;
  label: string;
  values: Record<string, { value: string; status?: EntityTranslation["status"] }>;
  multiline: boolean;
  rows?: number;
}) {
  const ctx = useBlockTranslations();
  const translatableFields = getTranslatableFieldsForBlockType(block.type);
  const nonDefaultLocales = ctx.locales.filter((l) => l.code !== ctx.defaultLocaleCode);
  const blockTranslated = translatableFields.filter((f) => {
    const fv = ctx.getFieldValues(block.id, f);
    return nonDefaultLocales.some((l) => (fv[l.code]?.value ?? "").trim());
  }).length;

  return (
    <div className="space-y-1">
      {field === translatableFields[0] && nonDefaultLocales.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">
          {blockTranslated}/{translatableFields.length} fields translated (avg{" "}
          {nonDefaultLocales.map((l) => l.code.toUpperCase()).join(", ")})
        </p>
      ) : null}
      <LocalizedBlockField
        label={label}
        field={field}
        locales={ctx.locales}
        defaultLocaleCode={ctx.defaultLocaleCode}
        values={values}
        legacyProps={block.props}
        multiline={multiline}
        rows={rows}
        onChange={(localeCode, value) => ctx.setFieldValue(block.id, field, localeCode, value)}
        onDuplicateFromDefault={(targetCode) => ctx.duplicateFromDefault(block.id, field, targetCode)}
      />
    </div>
  );
}

export function LocalizedBlockTitle({
  block,
  field = "title",
}: {
  block: BlockNode;
  field?: string;
}) {
  const ctx = useBlockTranslations();
  const values = ctx.getFieldValues(block.id, field);

  return (
    <LocalizedBlockFieldWrapper
      block={block}
      field={field}
      label="Title"
      values={values}
      multiline={false}
    />
  );
}

export function LocalizedBlockTextarea({
  block,
  field,
  label,
  rows = 4,
}: {
  block: BlockNode;
  field: string;
  label?: string;
  rows?: number;
}) {
  const ctx = useBlockTranslations();
  const values = ctx.getFieldValues(block.id, field);

  return (
    <LocalizedBlockFieldWrapper
      block={block}
      field={field}
      label={label ?? field}
      values={values}
      multiline
      rows={rows}
    />
  );
}

export function BlockTranslationsHiddenInput() {
  const ctx = useBlockTranslationsOptional();
  if (!ctx || !ctx.parentId) return null;
  const serialized = JSON.stringify(ctx.getSerializedInputs());
  return <input type="hidden" name="blockTranslations" value={serialized} readOnly />;
}

export function LocalizedBlockInput({
  block,
  field,
  label,
}: {
  block: BlockNode;
  field: string;
  label: string;
}) {
  const ctx = useBlockTranslations();
  const values = ctx.getFieldValues(block.id, field);

  return (
    <LocalizedBlockFieldWrapper
      block={block}
      field={field}
      label={label}
      values={values}
      multiline={false}
    />
  );
}
