import { prisma } from "@/lib/prisma";
import { CompanyAdminForm } from "@/components/admin/company-admin-form";

export default async function AdminCompanyPage() {
  let company = null;
  try {
    company = await prisma.companyInfo.findUnique({ where: { id: "default" } });
  } catch {
    // DB not connected
  }

  return <CompanyAdminForm company={company} />;
}
