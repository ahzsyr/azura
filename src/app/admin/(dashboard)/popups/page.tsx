import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { PopupAdminClient } from "@/features/popups/popup-admin-client";
import { resolveSitePopups } from "@/features/popups/resolve-site-popups";

export const metadata = {
  title: "Popup Management",
};

export default async function PopupsAdminPage() {
  const siteSettings = await readSiteSettings();
  const settings = resolveSitePopups(siteSettings);

  return <PopupAdminClient initialSettings={settings} />;
}
