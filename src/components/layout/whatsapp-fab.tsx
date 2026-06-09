"use client";

import { getWhatsAppUrl } from "@/lib/utils";
import { WhatsAppIcon } from "@/features/whatsapp/components/whatsapp-icon";
import {
  getFabPositionStyle,
  getFabSizeClass,
  getFabStyle,
} from "@/features/whatsapp/components/whatsapp-styles";
import type { WhatsAppFabSettings } from "@/features/whatsapp/whatsapp.schema";
import { cn } from "@/lib/utils";

type Props = {
  phone: string;
  message: string;
  settings: WhatsAppFabSettings;
  ariaLabel?: string;
};

export function WhatsAppFab({
  phone,
  message,
  settings,
  ariaLabel = "Chat on WhatsApp",
}: Props) {
  if (!settings.enabled || !phone.trim()) return null;

  return (
    <a
      href={getWhatsAppUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "wa-fab-root fixed z-50 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        getFabSizeClass(settings.size),
      )}
      style={{
        ...getFabPositionStyle(settings),
        ...getFabStyle(settings),
      }}
      aria-label={ariaLabel}
    >
      {settings.showIcon ? (
        <WhatsAppIcon
          iconUrl={settings.iconUrl}
          iconSize={settings.iconSize}
          size={settings.size}
        />
      ) : null}
    </a>
  );
}
