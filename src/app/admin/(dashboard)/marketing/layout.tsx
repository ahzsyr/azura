import { notFound } from "next/navigation";
import {
  assertMarketingReadAllowed,
  isMarketingCoreEnabled,
} from "@/modules/marketing/feature-flags";

export default async function MarketingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isMarketingCoreEnabled())) notFound();
  try {
    await assertMarketingReadAllowed();
  } catch {
    notFound();
  }
  return children;
}
