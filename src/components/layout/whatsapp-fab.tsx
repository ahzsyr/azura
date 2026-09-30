"use client";

import { useEffect, useState } from "react";
import { getWhatsAppUrl } from "@/lib/utils";
import { WhatsAppIcon } from "@/features/whatsapp/components/whatsapp-icon";
import {
  getFabClassName,
  getFabPositionClassName,
  getFabPositionStyle,
  getFabStyle,
  type LayoutDir,
} from "@/features/whatsapp/components/whatsapp-styles";
import type { WhatsAppFabSettings } from "@/features/whatsapp/whatsapp.schema";
import { cn } from "@/lib/utils";

type Props = {
  phone: string;
  message: string;
  settings: WhatsAppFabSettings;
  ariaLabel?: string;
  dir?: LayoutDir;
};

function readDocumentDir(): LayoutDir | null {
  if (typeof document === "undefined") return null;
  const htmlDir = document.documentElement.getAttribute("dir");
  return htmlDir === "rtl" || htmlDir === "ltr" ? htmlDir : null;
}

export function WhatsAppFab({
  phone,
  message,
  settings,
  ariaLabel = "Chat on WhatsApp",
  dir: dirProp,
}: Props) {
  const [entered, setEntered] = useState(false);
  const [htmlDir, setHtmlDir] = useState<LayoutDir>(() => dirProp ?? "ltr");
  const dir = dirProp === "rtl" || dirProp === "ltr" ? dirProp : htmlDir;

  useEffect(() => {
    setEntered(true);
  }, []);

  useEffect(() => {
    if (dirProp === "rtl" || dirProp === "ltr") return;
    const root = document.documentElement;
    const syncFromDocument = () => {
      const next = readDocumentDir();
      if (next) setHtmlDir(next);
    };
    syncFromDocument();
    const observer = new MutationObserver(syncFromDocument);
    observer.observe(root, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, [dirProp]);

  if (!settings.enabled || !phone.trim()) return null;

  return (
    <a
      href={getWhatsAppUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      dir={dir}
      className={cn(
        "wa-fab-anchor flex items-center justify-center rounded-full focus-visible:outline-none",
        getFabClassName(settings.size),
        getFabPositionClassName(settings),
        entered && "wa-fab-root--enter",
      )}
      style={{
        ...getFabPositionStyle(settings, dir),
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
