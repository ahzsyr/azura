"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ContactTheme } from "@/features/builder/blocks/contact/schemas/common";

const ContactThemeContext = createContext<ContactTheme | null>(null);

export function ContactThemeProvider({
  theme,
  children,
}: {
  theme?: ContactTheme | null;
  children: ReactNode;
}) {
  return (
    <ContactThemeContext.Provider value={theme ?? null}>{children}</ContactThemeContext.Provider>
  );
}

export function useContactTheme(): ContactTheme | null {
  return useContext(ContactThemeContext);
}
