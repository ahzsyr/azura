"use client";

import { useLocale, useTranslations } from "next-intl";
import { ContactList } from "@/components/ui/contact-list";
import { getLocalizedField } from "@/lib/utils";
import type { ContactTheme } from "@/features/builder/blocks/contact/schemas/common";
import type { ContactPhoneProps } from "@/features/builder/blocks/contact/schemas/phone";
import { ContactCard } from "./contact-card";

type Props = {
  props: ContactPhoneProps;
  theme?: ContactTheme | null;
};

export function ContactPhoneView({ props, theme }: Props) {
  const locale = useLocale();
  const t = useTranslations("contact");
  return (
    <ContactCard
      title={props.title || t("phoneEmail")}
      description={props.description}
      icon={props.icon || "phone"}
      props={props}
      theme={theme}
    >
      <ContactList
        items={(props.items ?? []).map((item) => ({
          id: item.id,
          icon: item.icon,
          title: getLocalizedField(item as unknown as Record<string, unknown>, "itemTitle", locale, {
            includeLegacySuffixFields: true,
          }),
          subtitle: getLocalizedField(item as unknown as Record<string, unknown>, "subtitle", locale, {
            includeLegacySuffixFields: true,
          }),
          value: item.value,
          url: item.url,
          openNewTab: item.openNewTab,
          showCopyBtn: item.showCopyBtn,
          badge: getLocalizedField(item as unknown as Record<string, unknown>, "badge", locale, {
            includeLegacySuffixFields: true,
          }),
        }))}
      />
    </ContactCard>
  );
}
