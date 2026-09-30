import type { DemoProfile } from "@/features/setup/demo-import/types";
import { safarCompany, safarTheme } from "./company";
import { buildSafarHeader, buildSafarFooter } from "./header-footer";
import { safarMediaFiles, safarSampleData } from "./sample-data";
import { safarPages } from "./pages";

export const safarAlMadinaProfile: DemoProfile = {
  meta: {
    id: "demo-safar",
    displayName: "Safar Al-Madina Travel Agency",
    description: "Travel & tourism demo",
    presetId: "travel",
    siteName: "Safar Al-Madina Travel Agency",
    tagline: "Your Trusted Partner for Memorable Travel Experiences",
  },
  company: safarCompany,
  theme: safarTheme,
  header: buildSafarHeader(),
  footer: buildSafarFooter(),
  mediaFiles: safarMediaFiles,
  sampleData: safarSampleData,
  pages: safarPages,
};
