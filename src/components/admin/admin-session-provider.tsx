"use client";

import { SessionProvider } from "next-auth/react";

/** Admin-only session context; reduces noisy refetches while editing. */
export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </SessionProvider>
  );
}
