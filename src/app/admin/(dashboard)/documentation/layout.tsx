import { notFound } from "next/navigation";
import { isModuleActive } from "@/modules/documentation/module-profile";

export default async function DocumentationAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleActive())) notFound();
  return children;
}
