import { materializeDemoProfile } from "./materialize-profile";
import { getBuiltinDemoProfile } from "./profiles";
import { DEMO_PROFILES_NAMESPACE } from "./profile-id";
import { parseSerializedDemoProfile } from "./serialized-profile.schema";
import type { FooterWorkspace } from "@/features/footer/types";
import type { HeaderWorkspace } from "@/features/navigation/types";
import type { ProfileId } from "./profile-id";
import type { ResolvedDemoProfile, SerializedDemoProfile } from "./types";
import { isBuiltinProfileId, isCustomProfileId, customProfileSlug } from "./profile-id";

export function resolveSerializedProfile(data: SerializedDemoProfile): ResolvedDemoProfile {
  return {
    meta: data.meta,
    company: data.company,
    theme: data.theme,
    header: data.header as unknown as HeaderWorkspace,
    footer: data.footer as unknown as FooterWorkspace,
    mediaFiles: data.mediaFiles,
    sampleData: data.sampleData as ResolvedDemoProfile["sampleData"],
    pages: data.pages.map((p) => ({
      slug: p.slug,
      templateKey: p.templateKey,
      titleEn: p.titleEn,
      titleAr: p.titleAr,
      excerptEn: p.excerptEn,
      excerptAr: p.excerptAr,
      blocks: p.blocks as ResolvedDemoProfile["pages"][0]["blocks"],
    })),
  };
}

export async function resolveProfileById(profileId: ProfileId): Promise<ResolvedDemoProfile | null> {
  if (isBuiltinProfileId(profileId)) {
    const builtin = getBuiltinDemoProfile(profileId);
    if (!builtin) return null;
    return resolveSerializedProfile(materializeDemoProfile(builtin));
  }

  if (isCustomProfileId(profileId)) {
    const slug = customProfileSlug(profileId);
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    const raw = await jsonStoreService.get<SerializedDemoProfile>(DEMO_PROFILES_NAMESPACE, slug);
    if (!raw) return null;
    return resolveSerializedProfile(parseSerializedDemoProfile(raw));
  }

  return null;
}
