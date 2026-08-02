"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { getDirectionSync } from "@/i18n/locale-config";
import type {
  ContactTheme,
  ResolvedContactCardAppearance,
} from "@/features/builder/blocks/contact/schemas/common";
import { resolveContactAppearance } from "@/features/builder/blocks/contact/schemas/common";
import type { ContactCardBase } from "@/features/builder/blocks/contact/schemas/common";
import { ContactIcon } from "./contact-icon";
import { useContactTheme } from "./contact-theme-context";

const RADIUS: Record<ResolvedContactCardAppearance["borderRadius"], string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const SHADOW: Record<ResolvedContactCardAppearance["shadow"], string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

const PADDING: Record<ResolvedContactCardAppearance["padding"], string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
  xl: "p-8",
};

/** Logical alignment so "left" = start and "right" = end under both LTR and RTL.
 * Start uses default stretch so rows stay full-width; center/end pack on the cross axis. */
const ALIGN: Record<ResolvedContactCardAppearance["alignment"], string> = {
  left: "text-start",
  center: "text-center items-center",
  right: "text-end items-end",
};

const CARD_STYLE: Record<ResolvedContactCardAppearance["cardStyle"], string> = {
  card: "bg-card border border-border",
  flat: "bg-transparent",
  bordered: "bg-transparent border border-border",
  filled: "bg-muted/60 border border-transparent",
};

const ANIMATION: Record<ResolvedContactCardAppearance["animation"], string> = {
  none: "",
  fadeIn: "animate-in fade-in duration-500",
  slideUp: "animate-in fade-in slide-in-from-bottom-2 duration-500",
};

type Props = {
  title?: string;
  description?: string;
  icon?: string;
  props: Partial<ContactCardBase>;
  theme?: ContactTheme | null;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

export function ContactCard({
  title,
  description,
  icon,
  props,
  theme,
  children,
  className,
  footer,
}: Props) {
  const locale = useLocale();
  const inheritedTheme = useContactTheme();
  const appearance = resolveContactAppearance(props, theme ?? inheritedTheme);
  const showHeader = Boolean(title || description || icon);
  const dir = getDirectionSync(locale);

  return (
    <div
      dir={dir}
      className={cn(
        "flex flex-col gap-4",
        RADIUS[appearance.borderRadius],
        SHADOW[appearance.shadow],
        PADDING[appearance.padding],
        CARD_STYLE[appearance.cardStyle],
        ALIGN[appearance.alignment],
        ANIMATION[appearance.animation],
        className,
      )}
    >
      {showHeader ? (
        <div
          className={cn(
            "flex w-full gap-3",
            appearance.iconPosition === "top" && "flex-col",
            // "left"/"right" mean start/end; with dir set, row already flips for RTL.
            appearance.iconPosition === "right" && "flex-row-reverse",
            appearance.alignment === "center" && "items-center",
            appearance.alignment === "right" && "justify-end",
          )}
        >
          {icon ? (
            <ContactIcon name={icon} style={appearance.iconStyle} />
          ) : null}
          <div
            className={cn(
              "min-w-0",
              appearance.alignment === "center" ? "w-full" : "flex-1",
            )}
          >
            {title ? (
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="w-full flex-1 text-start">{children}</div>
      {footer ? <div className="w-full pt-1">{footer}</div> : null}
    </div>
  );
}
