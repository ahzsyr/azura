import { prisma } from "@/lib/prisma";
import { jsonStoreService } from "@/features/storage/json-store.service";
import { materializeDemoProfile } from "./materialize-profile";
import { DEMO_PROFILE_META, getBuiltinDemoProfile } from "./profiles";
import {
  customProfileId,
  customProfileSlug,
  DEMO_PROFILES_NAMESPACE,
  isBuiltinProfileId,
  slugifyProfileName,
  type ProfileId,
} from "./profile-id";
import {
  parseSerializedDemoProfile,
  type SerializedDemoProfile,
} from "./serialized-profile.schema";
import { resolveProfileById, resolveSerializedProfile } from "./resolve-profile";
import type { DemoProfileListItem } from "./types";

const LAST_APPLIED_KEY = "demo-profiles.lastApplied";
const HIDDEN_BUILTINS_KEY = "demo-profiles.hiddenBuiltins";

function parseHiddenBuiltinIds(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  const ids = raw.filter((value): value is string => typeof value === "string" && isBuiltinProfileId(value));
  return new Set(ids);
}

function buildBuiltinDemoProfileItems(hiddenBuiltinIds: Set<string>): DemoProfileListItem[] {
  return DEMO_PROFILE_META
    .filter((meta) => !hiddenBuiltinIds.has(meta.id))
    .map((meta) => {
    const profile = getBuiltinDemoProfile(meta.id);
    return {
      id: meta.id,
      slug: meta.slug,
      displayName: meta.title,
      description: meta.description,
      siteName: meta.siteName,
      tagline: meta.tagline,
      presetId: meta.presetId,
      source: "builtin" as const,
      pageCount: profile?.pages.length ?? 0,
      updatedAt: null,
      editable: false,
      deletable: true,
    };
    });
}

function mapCustomDemoProfileRows(
  customRows: Awaited<ReturnType<typeof jsonStoreService.listNamespace>>,
): DemoProfileListItem[] {
  return customRows.map((row) => {
    let pageCount = 0;
    let displayName = row.key;
    let description = "";
    let siteName = row.key;
    let tagline = "";
    let presetId = "CLASSIC";
    try {
      const parsed = parseSerializedDemoProfile(row.data);
      pageCount = parsed.pages.length;
      displayName = parsed.meta.displayName;
      description = parsed.meta.description;
      siteName = parsed.meta.siteName;
      tagline = parsed.meta.tagline;
      presetId = parsed.meta.presetId;
    } catch {
      /* keep defaults */
    }
    return {
      id: customProfileId(row.key),
      slug: row.key,
      displayName,
      description,
      siteName,
      tagline,
      presetId,
      source: "custom" as const,
      pageCount,
      updatedAt: row.updatedAt.toISOString(),
      editable: true,
      deletable: true,
    };
  });
}

/** Single DB round-trip for admin demo-profiles page (avoids parallel pool contention). */
export async function loadDemoProfilesAdminData(): Promise<{
  profiles: DemoProfileListItem[];
  lastApplied: {
    profileId: string;
    displayName: string;
    appliedAt: string;
  } | null;
}> {
  const builtins = buildBuiltinDemoProfileItems(new Set());
  try {
    const rows = await prisma.jsonStore.findMany({
      where: {
        OR: [
          { namespace: DEMO_PROFILES_NAMESPACE },
          { namespace: "settings", key: LAST_APPLIED_KEY },
          { namespace: "settings", key: HIDDEN_BUILTINS_KEY },
        ],
      },
      orderBy: { key: "asc" },
    });

    const lastAppliedRow = rows.find(
      (row) => row.namespace === "settings" && row.key === LAST_APPLIED_KEY,
    );
    const hiddenBuiltinsRow = rows.find(
      (row) => row.namespace === "settings" && row.key === HIDDEN_BUILTINS_KEY,
    );
    const hiddenBuiltinIds = parseHiddenBuiltinIds(hiddenBuiltinsRow?.data);
    const customRows = rows.filter((row) => row.namespace === DEMO_PROFILES_NAMESPACE);
    const customs = mapCustomDemoProfileRows(customRows);
    const visibleBuiltins = buildBuiltinDemoProfileItems(hiddenBuiltinIds);
    const allProfiles = [...visibleBuiltins, ...customs.sort((a, b) => a.displayName.localeCompare(b.displayName))];
    const canDeleteAny = allProfiles.length > 1;

    return {
      profiles: allProfiles.map((profile) => ({
        ...profile,
        deletable: canDeleteAny,
      })),
      lastApplied: lastAppliedRow
        ? (lastAppliedRow.data as {
            profileId: string;
            displayName: string;
            appliedAt: string;
          })
        : null,
    };
  } catch (error) {
    console.error("[demo-profiles] loadDemoProfilesAdminData failed:", error);
    return { profiles: builtins, lastApplied: null };
  }
}

export async function listAllDemoProfiles(): Promise<DemoProfileListItem[]> {
  const { profiles } = await loadDemoProfilesAdminData();
  return profiles;
}

export async function getSerializedProfileById(
  profileId: ProfileId
): Promise<SerializedDemoProfile | null> {
  if (isBuiltinProfileId(profileId)) {
    const builtin = getBuiltinDemoProfile(profileId);
    if (!builtin) return null;
    return materializeDemoProfile(builtin);
  }

  const slug = customProfileSlug(profileId);
  const raw = await jsonStoreService.get<SerializedDemoProfile>(DEMO_PROFILES_NAMESPACE, slug);
  if (!raw) return null;
  return parseSerializedDemoProfile(raw);
}

export async function saveCustomDemoProfile(
  slug: string,
  data: SerializedDemoProfile
): Promise<void> {
  const normalized = slugifyProfileName(slug);
  const payload: SerializedDemoProfile = {
    ...data,
    meta: {
      ...data.meta,
      id: customProfileId(normalized),
    },
  };
  parseSerializedDemoProfile(payload);
  await jsonStoreService.set(DEMO_PROFILES_NAMESPACE, normalized, payload as never, { revalidate: true });
}

export async function deleteCustomDemoProfile(slug: string): Promise<void> {
  await jsonStoreService.delete(DEMO_PROFILES_NAMESPACE, slug);
}

export async function deleteDemoProfile(profileId: ProfileId): Promise<void> {
  if (isBuiltinProfileId(profileId)) {
    const raw = await jsonStoreService.get<unknown>("settings", HIDDEN_BUILTINS_KEY);
    const hiddenIds = parseHiddenBuiltinIds(raw);
    hiddenIds.add(profileId);
    await jsonStoreService.set("settings", HIDDEN_BUILTINS_KEY, Array.from(hiddenIds) as never, { revalidate: true });
    return;
  }
  await deleteCustomDemoProfile(customProfileSlug(profileId));
}

export async function duplicateDemoProfile(
  sourceId: ProfileId,
  newSlug: string,
  newName?: string
): Promise<{ slug: string; id: ProfileId }> {
  const source = await getSerializedProfileById(sourceId);
  if (!source) throw new Error("Source profile not found");

  const slug = slugifyProfileName(newSlug);
  const copy: SerializedDemoProfile = JSON.parse(JSON.stringify(source)) as SerializedDemoProfile;
  copy.meta = {
    ...copy.meta,
    id: customProfileId(slug),
    displayName: newName?.trim() || `${copy.meta.displayName} (Copy)`,
  };

  await saveCustomDemoProfile(slug, copy);
  return { slug, id: customProfileId(slug) };
}

export async function getLastAppliedDemoProfile(): Promise<{
  profileId: string;
  displayName: string;
  appliedAt: string;
} | null> {
  const raw = await jsonStoreService.get<{ profileId: string; displayName: string; appliedAt: string }>(
    "settings",
    "demo-profiles.lastApplied"
  );
  return raw ?? null;
}

export async function setLastAppliedDemoProfile(
  profileId: ProfileId,
  displayName: string
): Promise<void> {
  await jsonStoreService.set("settings", "demo-profiles.lastApplied", {
    profileId,
    displayName,
    appliedAt: new Date().toISOString(),
  }, { revalidate: true });
}

export { resolveProfileById, resolveSerializedProfile };
