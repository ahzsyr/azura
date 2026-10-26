import { CompanyAdminForm } from "@/components/admin/company-admin-form";
import { loadCompanyInfoWithTranslations } from "@/features/translation/admin-entity-helpers";
import { getSessionCountryCode } from "@/lib/request-country";

export default async function AdminCompanyPage() {
  let company = null;
  try {
    company = await loadCompanyInfoWithTranslations();
  } catch {
    // DB not connected
  }

  // New/empty phone fields follow the session location; saved numbers keep
  // the country encoded in their stored dialling code.
  const defaultPhoneCountry = await getSessionCountryCode();

  return <CompanyAdminForm company={company} defaultPhoneCountry={defaultPhoneCountry} />;
}
