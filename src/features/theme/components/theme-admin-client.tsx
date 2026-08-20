"use client";

import { Suspense } from "react";
import type { SiteTheme } from "@prisma/client";
import { ThemeStudioForm } from "@/features/theme/components/theme-studio";
import type { ChromePageOption } from "@/features/theme/chrome-page-options";

export function ThemeAdminClient({
  draft,
  published,
  chromePages,
}: {
  draft: SiteTheme | null;
  published: SiteTheme | null;
  chromePages?: ChromePageOption[];
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Theme Studio…</p>}>
      <ThemeStudioForm draft={draft} published={published} chromePages={chromePages} />
    </Suspense>
  );
}
