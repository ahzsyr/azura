import { Suspense } from "react";
import { loadSearchSettingsPageData } from "@/features/search/actions/search-settings.actions";
import { SearchSettingsAdminClient } from "@/features/search/admin/search-settings-client";

export const metadata = {
  title: "Search Settings",
};

export default async function AdminSearchSettingsPage() {
  const data = await loadSearchSettingsPageData();
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading search settings…</div>}>
      <SearchSettingsAdminClient {...data} />
    </Suspense>
  );
}
