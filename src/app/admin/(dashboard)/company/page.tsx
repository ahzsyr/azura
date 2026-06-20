import { CompanyAdminForm } from "@/components/admin/company-admin-form";
import { loadCompanyInfoWithTranslations } from "@/features/translation/admin-entity-helpers";

export default async function AdminCompanyPage() {
  let company = null;
  try {
    company = await loadCompanyInfoWithTranslations();
  } catch {
    // DB not connected
  }

  return <CompanyAdminForm company={company} />;
}
