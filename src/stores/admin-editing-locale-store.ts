"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AdminEditingLocaleState = {
  activeLocaleCode: string;
  setActiveLocaleCode: (code: string) => void;
};

export const useAdminEditingLocaleStore = create<AdminEditingLocaleState>()(
  persist(
    (set) => ({
      activeLocaleCode: "en",
      setActiveLocaleCode: (code) => set({ activeLocaleCode: code }),
    }),
    { name: "admin-editing-locale" }
  )
);
