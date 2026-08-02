import { getLocale } from "next-intl/server";
import { MarketingMaintenancePage } from "@/features/cms/components/marketing-maintenance-page";

/** Public 404 uses the same layout and copy as the CMS maintenance status page. */
export default async function NotFoundPage() {
  const locale = await getLocale();
  return <MarketingMaintenancePage locale={locale} />;
}
