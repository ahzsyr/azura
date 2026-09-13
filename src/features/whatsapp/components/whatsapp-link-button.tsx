"use client";

import { Button } from "@/components/ui/button";
import { getWhatsAppUrl } from "@/lib/utils";
import { WhatsAppIcon } from "@/features/whatsapp/components/whatsapp-icon";
import {
  getCustomButtonStyle,
  getPageButtonVariant,
} from "@/features/whatsapp/components/whatsapp-styles";
import type { WhatsAppPageButtonSettings } from "@/features/whatsapp/whatsapp.schema";
import { cn } from "@/lib/utils";

type Props = {
  phone: string;
  message: string;
  appearance: WhatsAppPageButtonSettings;
  label: string;
  className?: string;
};

export function WhatsAppLinkButton({
  phone,
  message,
  appearance,
  label,
  className,
}: Props) {
  if (!appearance.enabled || !phone.trim()) return null;

  const href = getWhatsAppUrl(phone, message);
  const variant = getPageButtonVariant(appearance);
  const customStyle = getCustomButtonStyle(appearance);
  const buttonSize =
    appearance.size === "sm" ? "sm" : appearance.size === "lg" ? "lg" : "default";

  return (
    <Button
      asChild
      variant={variant}
      size={buttonSize}
      className={cn(
        appearance.fullWidth !== false && "w-full",
        appearance.buttonVariant === "custom" && "border hover:opacity-90",
        className,
      )}
      style={customStyle}
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        {appearance.showIcon ? (
          <WhatsAppIcon
            iconUrl={appearance.iconUrl}
            iconSize={appearance.iconSize}
            size={appearance.size}
          />
        ) : null}
        {appearance.showLabel ? label : null}
      </a>
    </Button>
  );
}
