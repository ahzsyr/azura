"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  computePatch,
  countPatchFields,
  flattenPatchPaths,
  getChangedSections,
  isEmptyPatch,
  type SectionMapEntry,
} from "@/lib/patch";
import {
  EMPTY_PATCH_META,
  useAdminUiStore,
  type PatchMeta,
  type PageActions,
} from "@/stores/admin-ui-store";
import { useAdminFormState } from "@/hooks/use-admin-form";

export type UsePatchFormStateOptions<T extends Record<string, unknown>> = PageActions & {
  getBaseline: () => T;
  getCurrent: () => T;
  sectionMap?: SectionMapEntry[];
  onSavePatch?: (changes: Partial<T>) => boolean | void | Promise<boolean | void>;
  syncKey?: unknown;
};

export function syncPatchMetaFromState<T extends Record<string, unknown>>(
  baseline: T,
  current: T,
  sectionMap: SectionMapEntry[] = [],
  baselineRevision = 0,
): PatchMeta {
  const changes = computePatch(baseline, current) as Record<string, unknown>;
  if (isEmptyPatch(changes)) {
    return { ...EMPTY_PATCH_META, baselineRevision };
  }
  const dirtyPaths = flattenPatchPaths(changes);
  return {
    dirtyPaths,
    dirtyFieldsCount: countPatchFields(changes),
    changedSections: getChangedSections(dirtyPaths, sectionMap),
    baselineRevision,
  };
}

function pickPageActions<T extends Record<string, unknown>>(
  opts: UsePatchFormStateOptions<T> | undefined,
): PageActions | undefined {
  if (!opts) return undefined;
  const {
    getBaseline: _b,
    getCurrent: _c,
    sectionMap: _s,
    onSavePatch: _p,
    syncKey: _k,
    ...pageActions
  } = opts;
  return pageActions;
}

export function usePatchFormState<T extends Record<string, unknown>>(
  options?: UsePatchFormStateOptions<T>,
) {
  const setPatchMeta = useAdminUiStore((s) => s.setPatchMeta);
  const clearPatchMeta = useAdminUiStore((s) => s.clearPatchMeta);
  const bumpBaselineRevision = useAdminUiStore((s) => s.bumpBaselineRevision);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const baselineRevisionRef = useRef(0);

  const recomputePatchMeta = useCallback(() => {
    const opts = optionsRef.current;
    if (!opts?.getBaseline || !opts?.getCurrent) {
      clearPatchMeta();
      return EMPTY_PATCH_META;
    }
    try {
      const meta = syncPatchMetaFromState(
        opts.getBaseline(),
        opts.getCurrent(),
        opts.sectionMap ?? [],
        baselineRevisionRef.current,
      );
      setPatchMeta(meta);
      return meta;
    } catch {
      clearPatchMeta();
      return EMPTY_PATCH_META;
    }
  }, [clearPatchMeta, setPatchMeta]);

  const getPatch = useCallback((): Partial<T> => {
    const opts = optionsRef.current;
    if (!opts?.getBaseline || !opts?.getCurrent) return {};
    return computePatch(opts.getBaseline(), opts.getCurrent()) as Partial<T>;
  }, []);

  const hasChanges = useCallback((): boolean => {
    return !isEmptyPatch(getPatch() as Record<string, unknown>);
  }, [getPatch]);

  const resetBaseline = useCallback(() => {
    baselineRevisionRef.current += 1;
    bumpBaselineRevision();
    recomputePatchMeta();
  }, [bumpBaselineRevision, recomputePatchMeta]);

  const dispatchSave = useCallback(async (): Promise<boolean> => {
    const opts = optionsRef.current;
    if (!opts) return false;

    const patch = getPatch();
    const patchEmpty = isEmptyPatch(patch as Record<string, unknown>);

    if (patchEmpty && !opts.onSave && !opts.onSavePatch) {
      return true;
    }

    if (opts.onSavePatch && !patchEmpty) {
      const ok = await opts.onSavePatch(patch);
      if (ok !== false) resetBaseline();
      return ok !== false;
    }

    if (opts.onSave) {
      const ok = await opts.onSave();
      if (ok !== false) resetBaseline();
      return ok !== false;
    }

    return patchEmpty;
  }, [getPatch, resetBaseline]);

  const adminForm = useAdminFormState({
    ...pickPageActions(options),
    onSave:
      options?.onSave || options?.onSavePatch ? dispatchSave : undefined,
  });

  const { markUnsaved, markSaved, setSaveStatus } = adminForm;

  useEffect(() => {
    const meta = recomputePatchMeta();
    if (meta.dirtyFieldsCount > 0) {
      markUnsaved();
    }
  }, [options?.syncKey, recomputePatchMeta, markUnsaved]);

  useEffect(() => {
    return () => clearPatchMeta();
  }, [clearPatchMeta]);

  return {
    markUnsaved,
    markSaved,
    setSaveStatus,
    getPatch,
    hasChanges,
    resetBaseline,
    recomputePatchMeta,
  };
}
