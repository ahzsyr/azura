import { notFound } from "next/navigation";
import {
  assertDocumentationReadAllowed,
  isModuleActive,
} from "@/modules/documentation/module-profile";

export default async function DocumentationAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isModuleActive())) notFound();
  try {
    await assertDocumentationReadAllowed();
  } catch {
    notFound();
  }
  return children;
}
