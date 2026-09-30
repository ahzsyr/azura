"use client";

import { Suspense } from "react";
import type { SiteTheme } from "@prisma/client";
import { ThemeStudioForm } from "@/features/theme/components/theme-studio";
import type { ChromePageOption } from "@/features/theme/chrome-page-options";
import type { PageTransitionsSettings } from "@/features/preloader/page-transitions.schema";

export function ThemeAdminClient({
  draft,
  published,
  chromePages,
  pageTransitions,
}: {
  draft: SiteTheme | null;
  published: SiteTheme | null;
  chromePages?: ChromePageOption[];
  pageTransitions: PageTransitionsSettings;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Theme Studio…</p>}>
      <ThemeStudioForm
        draft={draft}
        published={published}
        chromePages={chromePages}
        pageTransitions={pageTransitions}
      />
    </Suspense>
  );
}
