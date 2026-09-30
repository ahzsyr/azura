"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../messages/en.json";

type Props = {
  children: ReactNode;
  locale?: string;
};

/** Admin live previews that mount storefront cards need next-intl for `@/i18n/navigation` Link. */
export function AdminStorefrontIntlProvider({ children, locale = "en" }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
