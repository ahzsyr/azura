"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type RefObject,
} from "react";
import { useAdminFormDirtySync, useAdminFormState } from "@/hooks/use-admin-form";
import { usePatchFormState } from "@/hooks/use-patch-form";
import { countPatchFields, isEmptyPatch, type SectionMapEntry } from "@/lib/patch";
import { useAdminUiStore } from "@/stores/admin-ui-store";

type AdminFormContextValue = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  showToast: (message: string, type: "success" | "error") => void;
  toast: { message: string; type: "success" | "error" } | null;
  dismissToast: () => void;
};

const AdminFormContext = createContext<AdminFormContextValue | null>(null);

type AdminFormProviderProps = {
  children: ReactNode;
  onSave?: () => boolean | void | Promise<boolean | void>;
  onSavePatch?: (changes: Record<string, unknown>) => boolean | void | Promise<boolean | void>;
  onPublish?: () => boolean | void | Promise<boolean | void>;
  onPreview?: () => void;
  onCancel?: () => void | Promise<void>;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canPublish?: boolean;
  canPreview?: boolean;
  canCancel?: boolean;
  trackFormId?: string;
  getBaseline?: () => Record<string, unknown>;
  getCurrent?: () => Record<string, unknown>;
  sectionMap?: SectionMapEntry[];
  patchSyncKey?: unknown;
  patchSaveToast?: boolean;
  /** When true, child components register topbar Save/Publish (e.g. embedded SeoMetaForm). */
  suppressPageActions?: boolean;
};

export function AdminFormDirtySync({
  formId,
  formRef,
  enabled = true,
}: {
  formId?: string;
  formRef?: RefObject<HTMLFormElement | null>;
  enabled?: boolean;
}) {
  useAdminFormDirtySync(formId ?? formRef ?? null, enabled);
  return null;
}

type RegistrarProps = Omit<
  AdminFormProviderProps,
  "children" | "trackFormId" | "patchSaveToast" | "getBaseline" | "getCurrent" | "sectionMap" | "patchSyncKey"
> & {
  onSave?: () => boolean | void | Promise<boolean | void>;
  onSavePatch?: (changes: Record<string, unknown>) => boolean | void | Promise<boolean | void>;
};

function PatchFormRegistrar({
  getBaseline,
  getCurrent,
  sectionMap,
  patchSyncKey,
  onSave,
  onSavePatch,
  onPublish,
  onPreview,
  onCancel,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  canPublish,
  canPreview,
  canCancel,
}: RegistrarProps & {
  getBaseline: () => Record<string, unknown>;
  getCurrent: () => Record<string, unknown>;
  sectionMap?: SectionMapEntry[];
  patchSyncKey?: unknown;
}) {
  usePatchFormState({
    getBaseline,
    getCurrent,
    sectionMap,
    syncKey: patchSyncKey,
    onSave,
    onSavePatch,
    onPublish,
    onPreview,
    onCancel,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    canPublish,
    canPreview,
    canCancel,
  });
  return null;
}

function LegacyFormRegistrar({
  onSave,
  onPublish,
  onPreview,
  onCancel,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  canPublish,
  canPreview,
  canCancel,
}: RegistrarProps) {
  useAdminFormState({
    onSave,
    onPublish,
    onPreview,
    onCancel,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    canPublish,
    canPreview,
    canCancel,
  });
  return null;
}

export function AdminFormProvider({
  children,
  onSave,
  onSavePatch,
  onPublish,
  onPreview,
  onCancel,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  canPublish,
  canPreview,
  canCancel,
  trackFormId,
  getBaseline,
  getCurrent,
  sectionMap,
  patchSyncKey,
  patchSaveToast,
  suppressPageActions,
}: AdminFormProviderProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const patchMeta = useAdminUiStore((s) => s.patchMeta);
  const markUnsaved = useAdminUiStore((s) => s.markUnsaved);
  const markSaved = useAdminUiStore((s) => s.markSaved);

  const usePatch = Boolean(getBaseline && getCurrent);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const setDirty = useCallback(
    (dirty: boolean) => {
      setIsDirty(dirty);
      if (dirty) markUnsaved();
      else markSaved();
    },
    [markUnsaved, markSaved],
  );

  const handleSaveSuccess = useCallback(
    (fieldCount: number, durationMs: number) => {
      setIsDirty(false);
      if (patchSaveToast !== false && usePatch && fieldCount > 0) {
        showToast(
          `Saved ${fieldCount} change${fieldCount === 1 ? "" : "s"} in ${durationMs}ms`,
          "success",
        );
      }
    },
    [patchSaveToast, setIsDirty, showToast, usePatch],
  );

  const onSaveForPatch = useCallback(async () => {
    if (!onSave) return true;
    const started = performance.now();
    const ok = await onSave();
    if (ok !== false) {
      handleSaveSuccess(patchMeta.dirtyFieldsCount, Math.round(performance.now() - started));
    }
    return ok;
  }, [handleSaveSuccess, onSave, patchMeta.dirtyFieldsCount]);

  const onSavePatchForPatch = useCallback(
    async (changes: Record<string, unknown>) => {
      if (!onSavePatch) return false;
      const started = performance.now();
      const fieldCount = isEmptyPatch(changes) ? 0 : countPatchFields(changes);
      const ok = await onSavePatch(changes);
      if (ok !== false) {
        handleSaveSuccess(fieldCount, Math.round(performance.now() - started));
      }
      return ok;
    },
    [handleSaveSuccess, onSavePatch],
  );

  const onSaveForLegacy = useCallback(async () => {
    if (!onSave) return true;
    const ok = await onSave();
    if (ok !== false) setIsDirty(false);
    return ok;
  }, [onSave]);

  const registrarCommon = {
    onPublish,
    onPreview,
    onCancel: async () => {
      await onCancel?.();
      setIsDirty(false);
    },
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    canPublish,
    canPreview,
    canCancel,
  };

  return (
    <AdminFormContext.Provider value={{ isDirty, setDirty, showToast, toast, dismissToast }}>
      {!suppressPageActions &&
        (usePatch && getBaseline && getCurrent ? (
          <PatchFormRegistrar
            {...registrarCommon}
            getBaseline={getBaseline}
            getCurrent={getCurrent}
            sectionMap={sectionMap}
            patchSyncKey={patchSyncKey}
            onSave={onSave ? onSaveForPatch : undefined}
            onSavePatch={onSavePatch ? onSavePatchForPatch : undefined}
          />
        ) : (
          <LegacyFormRegistrar {...registrarCommon} onSave={onSave ? onSaveForLegacy : undefined} />
        ))}
      {trackFormId ? <AdminFormDirtySync formId={trackFormId} /> : null}
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[100] rounded-lg border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-bottom-4 fade-in ${
            toast.type === "success"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.message}
        </div>
      )}
    </AdminFormContext.Provider>
  );
}

export function useAdminForm() {
  const ctx = useContext(AdminFormContext);
  if (!ctx) {
    throw new Error("useAdminForm must be used within AdminFormProvider");
  }
  return ctx;
}

export function useAdminFormOptional() {
  return useContext(AdminFormContext);
}
