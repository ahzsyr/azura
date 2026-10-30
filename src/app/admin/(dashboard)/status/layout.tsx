import { notFound } from "next/navigation";
import {
  assertStatusPageReadAllowed,
  isModuleActive,
} from "@/modules/status-page/module-profile";

export default async function StatusAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleActive())) notFound();
  try {
    await assertStatusPageReadAllowed();
  } catch {
    notFound();
  }
  return children;
}
