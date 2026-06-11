import type { DemoProfile } from "@/features/setup/demo-import/types";
import { brtCompany, brtTheme } from "./company";
import { buildBrtHeader, buildBrtFooter } from "./header-footer";
import { brtMediaFiles, brtSampleData } from "./sample-data";
import { brtPages } from "./pages";

export const brtTradingProfile: DemoProfile = {
  meta: {
    id: "demo-brt",
    displayName: "BRT TRADING LLC",
    description: "Wireless & smart technology solutions demo",
    presetId: "brt",
    siteName: "BRT TRADING LLC",
    tagline: "Innovative Wireless & Smart Technology Solutions",
    taglineAr: "حلول لاسلكية وتقنية ذكية مبتكرة",
  },
  company: brtCompany,
  theme: brtTheme,
  header: buildBrtHeader(),
  footer: buildBrtFooter(),
  mediaFiles: brtMediaFiles,
  sampleData: brtSampleData,
  pages: brtPages,
};
