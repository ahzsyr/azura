import type { DemoProfile, InstallMode } from "./types";
import type { BuiltinProfileId } from "./profile-id";
import { brtTradingProfile } from "@/seeds/demo-profiles/brt-trading";
import { safarAlMadinaProfile } from "@/seeds/demo-profiles/safar-al-madina";

const BUILTIN_PROFILES: Record<BuiltinProfileId, DemoProfile> = {
  "demo-brt": brtTradingProfile,
  "demo-safar": safarAlMadinaProfile,
};

/** @deprecated Use getBuiltinDemoProfile */
export function getDemoProfile(mode: InstallMode): DemoProfile | null {
  if (mode === "blank") return null;
  return BUILTIN_PROFILES[mode];
}

export function getBuiltinDemoProfile(id: BuiltinProfileId): DemoProfile | null {
  return BUILTIN_PROFILES[id] ?? null;
}

export const DEMO_PROFILE_META = [
  {
    id: "demo-brt" as const,
    slug: "demo-brt",
    label: "Import Demo 1",
    title: "BRT TRADING LLC",
    description: "Wireless & smart technology solutions — preconfigured pages, services, and sample data.",
    siteName: brtTradingProfile.meta.siteName,
    tagline: brtTradingProfile.meta.tagline,
    presetId: brtTradingProfile.meta.presetId,
  },
  {
    id: "demo-safar" as const,
    slug: "demo-safar",
    label: "Import Demo 2",
    title: "Safar Al-Madina Travel Agency",
    description: "Travel & tourism — tour packages, hotels, destinations, and sample records.",
    siteName: safarAlMadinaProfile.meta.siteName,
    tagline: safarAlMadinaProfile.meta.tagline,
    presetId: safarAlMadinaProfile.meta.presetId,
  },
];
