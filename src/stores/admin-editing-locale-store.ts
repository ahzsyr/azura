"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";

type AdminEditingLocaleState = {
  activeLocaleCode: string;
  setActiveLocaleCode: (code: string) => void;
};

export const useAdminEditingLocaleStore = create<AdminEditingLocaleState>()(
  persist(
    (set) => ({
      activeLocaleCode: DEFAULT_ADMIN_LOCALE.code,
      setActiveLocaleCode: (code) => set({ activeLocaleCode: code }),
    }),
    { name: "admin-editing-locale", skipHydration: true }
  )
);
