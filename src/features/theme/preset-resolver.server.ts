import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import type { ThemeTokens } from "@/types/theme";
import type { PresetDefinition } from "./preset-resolver.types";
import { isCloudNativeProduction } from "@/lib/cloud-native-guard";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";
import {
  resolveCloudPresetFromSources,
  resolvePresetCandidate,
} from "./preset-resolver.fallback";
import agencyPreset from "@/seeds/catalog/presets/agency.json";
import automotivePreset from "@/seeds/catalog/presets/automotive.json";
import brtPreset from "@/seeds/catalog/presets/brt.json";
import datacenterPreset from "@/seeds/catalog/presets/datacenter.json";
import educationPreset from "@/seeds/catalog/presets/education.json";
import enterpriseWifiPreset from "@/seeds/catalog/presets/enterprise-wifi.json";
import fashionPreset from "@/seeds/catalog/presets/fashion.json";
import financePreset from "@/seeds/catalog/presets/finance.json";
import gamingPreset from "@/seeds/catalog/presets/gaming.json";
import luxuryPreset from "@/seeds/catalog/presets/luxury.json";
import medicalPreset from "@/seeds/catalog/presets/medical.json";
import networkingPreset from "@/seeds/catalog/presets/networking.json";
import realestatePreset from "@/seeds/catalog/presets/realestate.json";
import restaurantPreset from "@/seeds/catalog/presets/restaurant.json";
import saasPreset from "@/seeds/catalog/presets/saas.json";
import smartHomePreset from "@/seeds/catalog/presets/smart-home.json";
import sportsPreset from "@/seeds/catalog/presets/sports.json";
import telecomPreset from "@/seeds/catalog/presets/telecom.json";
import travelPreset from "@/seeds/catalog/presets/travel.json";
import wirelessIspPreset from "@/seeds/catalog/presets/wireless-isp.json";

const FALLBACK_PRESET_ID = "travel";

const FALLBACK_BUNDLED: Record<string, PresetDefinition> = {
  agency: agencyPreset as PresetDefinition,
  automotive: automotivePreset as PresetDefinition,
  brt: brtPreset as PresetDefinition,
  datacenter: datacenterPreset as PresetDefinition,
  education: educationPreset as PresetDefinition,
  "enterprise-wifi": enterpriseWifiPreset as PresetDefinition,
  fashion: fashionPreset as PresetDefinition,
  finance: financePreset as PresetDefinition,
  gaming: gamingPreset as PresetDefinition,
  luxury: luxuryPreset as PresetDefinition,
  medical: medicalPreset as PresetDefinition,
  networking: networkingPreset as PresetDefinition,
  realestate: realestatePreset as PresetDefinition,
  restaurant: restaurantPreset as PresetDefinition,
  saas: saasPreset as PresetDefinition,
  "smart-home": smartHomePreset as PresetDefinition,
  sports: sportsPreset as PresetDefinition,
  telecom: telecomPreset as PresetDefinition,
  travel: travelPreset as PresetDefinition,
  "wireless-isp": wirelessIspPreset as PresetDefinition,
};

async function loadPresetFromJsonStore(id: string): Promise<PresetDefinition | null> {
  try {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    return await jsonStoreService.get<PresetDefinition>("theme-presets", id);
  } catch {
    return null;
  }
}

function presetsDir(): string {
  return path.join(catalogSeedRoot(), "presets");
}

export async function loadPresetJson(id: string): Promise<PresetDefinition | null> {
  if (isCloudNativeProduction()) {
    const fromStore = await loadPresetFromJsonStore(id);
    return resolveCloudPresetFromSources({
      requestedId: id,
      storePreset: fromStore,
      bundled: FALLBACK_BUNDLED,
    });
  }

  try {
    const raw = await readFile(path.join(presetsDir(), `${id}.json`), "utf-8");
    return JSON.parse(raw) as PresetDefinition;
  } catch {
    const fromStore = await loadPresetFromJsonStore(id);
    if (fromStore) return fromStore;
    return FALLBACK_BUNDLED[id] ?? null;
  }
}

export async function resolvePresetTheme(presetId?: string | null) {
  const candidate = presetId?.trim() || FALLBACK_PRESET_ID;
  const candidatePreset = await loadPresetJson(candidate);
  const fallbackPreset =
    candidatePreset?.id?.trim() === FALLBACK_PRESET_ID
      ? candidatePreset
      : await loadPresetJson(FALLBACK_PRESET_ID);
  const resolved = resolvePresetCandidate({
    candidateId: candidate,
    candidatePreset,
    fallbackId: FALLBACK_PRESET_ID,
    fallbackPreset,
  });
  if (!resolved) return null;
  const { preset, activeId } = resolved;

  return {
    siteDefaultPresetId: activeId,
    activePresetId: activeId,
    primaryColor: preset.colors.primary,
    secondaryColor: preset.colors.accent ?? preset.colors.secondary ?? preset.colors.primary,
    cursorEffect: preset.cursor ?? null,
    backgroundEffect: preset.backgroundEffect ?? null,
    textEffect: preset.textEffect ?? null,
    cardStyle: preset.cardStyle ?? null,
    borderStyle: preset.borderStyle ?? null,
    colors: preset.colors,
    fonts: preset.fonts,
    name: preset.name,
  };
}

export async function enrichTokensWithPreset(tokens: ThemeTokens): Promise<ThemeTokens> {
  const siteDefaultPresetId = tokens.siteDefaultPresetId;
  if (!siteDefaultPresetId) return tokens;
  const preset = await loadPresetJson(siteDefaultPresetId);
  if (!preset) return tokens;
  return {
    ...tokens,
    presetColors: {
      primary: preset.colors.primary,
      accent: preset.colors.accent ?? preset.colors.primary,
      background: preset.colors.background,
      surface: preset.colors.surface,
      text: preset.colors.text,
      textMuted: preset.colors.textMuted,
      secondary: preset.colors.secondary,
    },
    cardStyle: tokens.cardStyle ?? preset.cardStyle ?? null,
    borderStyle: tokens.borderStyle ?? preset.borderStyle ?? null,
  };
}
