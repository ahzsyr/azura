import { getTranslations } from "next-intl/server";
import { FooterView } from "@/features/footer/components/footer-view";
import type { ResolvedFooter, FooterCompanyInfo } from "@/features/footer/types";
import type { SiteBrandConfig } from "@/types/site-identity";

type Props = {
  resolved: ResolvedFooter;
  locale: string;
  brandConfig: SiteBrandConfig;
  company?: FooterCompanyInfo | null;
  compact?: boolean;
};

/** Async server footer — avoids client hydration for site chrome. */
export async function FooterRenderer({
  resolved,
  locale,
  brandConfig,
  company,
  compact,
}: Props) {
  const t = await getTranslations({ locale, namespace: "footer" });

  return (
    <FooterView
      resolved={resolved}
      locale={locale}
      brandConfig={brandConfig}
      company={company}
      compact={compact}
      rightsLabel={t("rights")}
    />
  );
}
