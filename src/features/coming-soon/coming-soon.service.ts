import "server-only";

import { getComingSoonEnvOverrideForAdmin } from "@/features/setup/setup.service";

export function getComingSoonEnvOverride(): boolean | null {
  return getComingSoonEnvOverrideForAdmin();
}

export {
  COMING_SOON_PATH,
  isComingSoonExemptApi,
  isComingSoonExemptPage,
  isComingSoonPublicPath,
} from "@/features/coming-soon/coming-soon.middleware";
