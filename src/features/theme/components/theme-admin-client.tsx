"use client";

import { Suspense } from "react";
import type { SiteTheme } from "@prisma/client";
import { ThemeStudioForm } from "@/features/theme/components/theme-studio";

export function ThemeAdminClient({ draft, published }: { draft: SiteTheme | null; published: SiteTheme | null }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Theme Studio…</p>}>
      <ThemeStudioForm draft={draft} published={published} />
    </Suspense>
  );
}
