"use client";

import { MessageCircle } from "lucide-react";
import { getWhatsappDefaultMessage } from "@/config/site";
import { getWhatsAppUrl } from "@/lib/utils";

type WhatsAppFabProps = {
  phone: string;
  message?: string;
};

export function WhatsAppFab({
  phone,
  message = getWhatsappDefaultMessage(),
}: WhatsAppFabProps) {
  if (!phone) return null;

  return (
    <a
      href={getWhatsAppUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
