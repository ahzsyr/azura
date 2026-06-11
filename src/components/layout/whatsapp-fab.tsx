"use client";

import { useEffect, useState } from "react";
import { getWhatsAppUrl } from "@/lib/utils";
import { WhatsAppIcon } from "@/features/whatsapp/components/whatsapp-icon";
import {
  getFabClassName,
  getFabPositionClassName,
  getFabPositionStyle,
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
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setEntered(true);
  }, []);

  if (!settings.enabled || !phone.trim()) return null;

  return (
    <a
      href={getWhatsAppUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "wa-fab-anchor fixed flex items-center justify-center rounded-full focus-visible:outline-none",
        getFabClassName(settings.size),
        getFabPositionClassName(settings),
        entered && "wa-fab-root--enter",
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
