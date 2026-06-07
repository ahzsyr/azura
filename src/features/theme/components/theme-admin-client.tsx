"use client";

import type { SiteTheme } from "@prisma/client";
import { ThemeSettingsForm } from "@/features/theme/components/theme-settings-form";

export function ThemeAdminClient({ draft, published }: { draft: SiteTheme | null; published: SiteTheme | null }) {
  return <ThemeSettingsForm draft={draft} published={published} />;
}
