import "server-only";

import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { cmsRepository } from "@/repositories/cms.repository";
import {
  mergeChromePageOptions,
  type ChromePageOption,
} from "./chrome-page-options";

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function listChromePageOptions(): Promise<ChromePageOption[]> {
  try {
    const pages = await cmsRepository.listPages();
    const cmsOptions: ChromePageOption[] = pages
      .filter((page) => !(page.slug in CMS_WIRED_MARKETING_SLUGS))
      .map((page) => ({
        path: getCmsPagePublicPath(page.slug),
        title: slugToTitle(page.slug),
        group: "CMS",
      }));
    return mergeChromePageOptions(cmsOptions);
  } catch {
    return mergeChromePageOptions([]);
  }
}
