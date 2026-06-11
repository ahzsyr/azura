import { prisma } from "@/lib/prisma";
import { Custom404SettingsClient } from "@/features/seo/admin/custom-404-settings-client";

export default async function Custom404AdminPage() {
  const pages = await prisma.custom404.findMany();

  return <Custom404SettingsClient pages={pages} />;
}
