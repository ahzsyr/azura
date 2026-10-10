"use client";

import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { Icon } from "@/features/icons/components/icon";
import { looksLikeIconLibraryId } from "@/features/icons/lib/icon-id-utils";
import type { FooterContactItemType } from "../../types";
import { defaultContactItemIcon } from "./schema";

type Props = {
  icon?: string;
  type: FooterContactItemType;
  className?: string;
};

export function ContactItemIcon({ icon, type, className }: Props) {
  const name = (icon ?? "").trim() || defaultContactItemIcon(type);
  if (!name) return null;
  if (looksLikeIconLibraryId(name)) {
    return <Icon iconId={name} className={className} />;
  }
  const LucideIcon = resolveMarketingIcon(name);
  return <LucideIcon className={className} aria-hidden />;
}
