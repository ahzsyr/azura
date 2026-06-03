"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAdminFormState } from "@/hooks/use-admin-form";

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
  onSave?: () => void | Promise<void>;
  onPublish?: () => void | Promise<void>;
  onPreview?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canPublish?: boolean;
  canPreview?: boolean;
};

export function AdminFormProvider({
  children,
  onSave,
  onPublish,
  onPreview,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  canPublish,
  canPreview,
}: AdminFormProviderProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { markUnsaved, markSaved } = useAdminFormState({
    onSave: async () => {
      await onSave?.();
      setIsDirty(false);
    },
    onPublish,
    onPreview,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    canPublish,
    canPreview,
  });

  const setDirty = useCallback(
    (dirty: boolean) => {
      setIsDirty(dirty);
      if (dirty) markUnsaved();
      else markSaved();
    },
    [markUnsaved, markSaved]
  );

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return (
    <AdminFormContext.Provider value={{ isDirty, setDirty, showToast, toast, dismissToast }}>
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
