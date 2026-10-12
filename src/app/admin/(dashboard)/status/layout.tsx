import { notFound } from "next/navigation";
import { isModuleActive } from "@/modules/status-page/module-profile";

export default async function StatusAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleActive())) notFound();
  return children;
}
