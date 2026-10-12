import { notFound } from "next/navigation";
import { isMarketingCoreEnabled } from "@/modules/marketing/feature-flags";

export default async function MarketingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isMarketingCoreEnabled())) notFound();
  return children;
}
