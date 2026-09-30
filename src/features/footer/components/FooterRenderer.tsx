import { getTranslations } from "next-intl/server";
import { FooterView } from "@/features/footer/components/footer-view";
import {
  accentsFromThemeTokens,
  type FooterChromeAccentPair,
} from "@/features/footer/lib/footer-chrome-tint";
import type { ResolvedFooter, FooterCompanyInfo } from "@/features/footer/types";
import type { SiteBrandConfig } from "@/types/site-identity";
import type { ThemeTokens } from "@/types/theme";

type Props = {
  resolved: ResolvedFooter;
  locale: string;
  brandConfig: SiteBrandConfig;
  company?: FooterCompanyInfo | null;
  compact?: boolean;
  /** Site theme — used to resolve accent footer chrome tint hexes. */
  theme?: ThemeTokens | null;
  /** Optional explicit accent pair (tests / overrides). */
  chromeAccents?: FooterChromeAccentPair | null;
};

/** Async server footer — avoids client hydration for site chrome. */
export async function FooterRenderer({
  resolved,
  locale,
  brandConfig,
  company,
  compact,
  theme,
  chromeAccents,
}: Props) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const accents = chromeAccents ?? accentsFromThemeTokens(theme);

  return (
    <FooterView
      resolved={resolved}
      locale={locale}
      brandConfig={brandConfig}
      company={company}
      compact={compact}
      rightsLabel={t("rights")}
      chromeAccents={accents}
    />
  );
}
