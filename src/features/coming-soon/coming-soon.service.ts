import "server-only";

import { getComingSoonEnvOverrideForAdmin } from "@/features/setup/setup.service";

export function getComingSoonEnvOverride(): boolean | null {
  return getComingSoonEnvOverrideForAdmin();
}

export {
  COMING_SOON_BYPASS_COOKIE,
  COMING_SOON_PATH,
  getComingSoonBypassSecret,
  hasComingSoonBypassCookie,
  isComingSoonExemptApi,
  isComingSoonExemptPage,
  isComingSoonPublicPath,
} from "@/features/coming-soon/coming-soon.middleware";
