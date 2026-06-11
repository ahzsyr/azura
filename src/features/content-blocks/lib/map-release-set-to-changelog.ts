import type { ReleaseSetPublic } from "@/features/releases/types";
import type { changelogReleaseSchema } from "@/features/content-blocks/schemas/content-blocks";
import type { z } from "zod";

type ChangelogRelease = z.infer<typeof changelogReleaseSchema>;

const CATEGORY_MAP: Record<string, keyof ChangelogRelease["sections"]> = {
  FEATURES: "features",
  IMPROVEMENTS: "improvements",
  FIXES: "fixes",
  BREAKING: "breaking",
  features: "features",
  improvements: "improvements",
  fixes: "fixes",
  breaking: "breaking",
};

function normalizeStatus(status: string): ChangelogRelease["status"] {
  const s = status.toLowerCase();
  if (s === "beta" || s === "deprecated" || s === "released") return s;
  return "released";
}

export function mapReleaseSetToChangelogReleases(
  set: ReleaseSetPublic,
  opts?: { filterTags?: string[]; filterStatuses?: ChangelogRelease["status"][] }
): ChangelogRelease[] {
  const tagFilter = opts?.filterTags?.filter(Boolean) ?? [];
  const statusFilter = opts?.filterStatuses ?? [];

  return set.releases
    .filter((release) => {
      if (statusFilter.length > 0 && !statusFilter.includes(normalizeStatus(release.status))) {
        return false;
      }
      if (tagFilter.length > 0 && !tagFilter.some((t) => release.tags.includes(t))) {
        return false;
      }
      return true;
    })
    .map((release) => {
      const sections: ChangelogRelease["sections"] = {
        features: [],
        improvements: [],
        fixes: [],
        breaking: [],
      };
      for (const entry of release.entries) {
        const key = CATEGORY_MAP[entry.category] ?? "features";
        sections[key].push({
          id: entry.id,
          textEn: entry.textEn,
          textAr: entry.textAr,
        });
      }
      return {
        id: release.id,
        version: release.version,
        date: release.releaseDate?.slice(0, 10) ?? "",
        status: normalizeStatus(release.status),
        tags: release.tags,
        sections,
      };
    });
}
