import { jsonStoreService } from "@/features/storage/json-store.service";
import {
  DEFAULT_WHATSAPP_SETTINGS,
  normalizeWhatsAppSettings,
  type WhatsAppSettings,
} from "@/features/whatsapp/whatsapp.schema";

const NAMESPACE = "whatsapp";
const SETTINGS_KEY = "settings";

export const whatsappService = {
  async get(): Promise<WhatsAppSettings> {
    const stored = await jsonStoreService.get<Partial<WhatsAppSettings>>(
      NAMESPACE,
      SETTINGS_KEY,
    );
    return normalizeWhatsAppSettings(stored);
  },

  async save(settings: WhatsAppSettings): Promise<WhatsAppSettings> {
    const normalized = normalizeWhatsAppSettings(settings);
    await jsonStoreService.set(NAMESPACE, SETTINGS_KEY, normalized);
    return normalized;
  },
};

export { DEFAULT_WHATSAPP_SETTINGS };
