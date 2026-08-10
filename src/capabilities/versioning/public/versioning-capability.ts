import { versioningService } from "../versioning.service";

export const versioningCapability = {
  id: "versioning" as const,
  onFieldWrite: versioningService.onFieldWrite.bind(versioningService),
  listVersions: versioningService.listVersions.bind(versioningService),
  listVersionsForField: versioningService.listVersionsForField.bind(versioningService),
  restoreVersion: versioningService.restoreVersion.bind(versioningService),
};
