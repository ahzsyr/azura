"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/guards";
import { revalidateWiredMarketingPaths } from "@/features/cms/revalidate-wired-marketing";
import { ok, fail, type ActionResult } from "@/types/api";
import { importDemoProfileById } from "./demo-import.service";
import {
  deleteCustomDemoProfile,
  duplicateDemoProfile,
  loadDemoProfilesAdminData,
  getSerializedProfileById,
  saveCustomDemoProfile,
} from "./demo-profile-registry.service";
import {
  exportCurrentSiteAsProfile,
  exportDemoProfileBundle,
  getDemoApplyPreviewCounts,
} from "./demo-export.service";
import { resolveProfileById } from "./resolve-profile";
import { parseSerializedDemoProfileJson } from "./serialized-profile.schema";
import { customProfileId, isCustomProfileId, slugifyProfileName, type ProfileId } from "./profile-id";
import type { DemoApplyPreview, DemoImportOverrides } from "./types";

export async function listDemoProfilesAction() {
  await requireAdmin();
  const { profiles, lastApplied } = await loadDemoProfilesAdminData();
  return { profiles, lastApplied };
}

export async function getDemoProfileJsonAction(
  profileId: ProfileId
): Promise<ActionResult<{ json: string; readOnly: boolean; slug: string }>> {
  await requireAdmin();
  try {
    const profile = await getSerializedProfileById(profileId);
    if (!profile) return fail("Profile not found");
    const slug = profileId.replace(/^custom:/, "");
    return ok({
      json: JSON.stringify(profile, null, 2),
      readOnly: !isCustomProfileId(profileId),
      slug,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load profile");
  }
}

export async function saveCustomDemoProfileAction(
  slug: string,
  json: string
): Promise<ActionResult> {
  await requireAdmin();
  try {
    const data = parseSerializedDemoProfileJson(json);
    await saveCustomDemoProfile(slug, data);
    revalidatePath("/admin/demo-profiles");
    revalidatePath(`/admin/demo-profiles/${slug}`);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Invalid profile JSON");
  }
}

export async function deleteCustomDemoProfileAction(slug: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteCustomDemoProfile(slug);
    revalidatePath("/admin/demo-profiles");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete profile");
  }
}

export async function duplicateDemoProfileAction(
  sourceId: ProfileId,
  newSlug: string,
  newName?: string
): Promise<ActionResult<{ slug: string; id: ProfileId }>> {
  await requireAdmin();
  try {
    const result = await duplicateDemoProfile(sourceId, newSlug, newName);
    revalidatePath("/admin/demo-profiles");
    return ok(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to duplicate profile");
  }
}

export async function exportDemoProfileAction(
  profileId: ProfileId
): Promise<ActionResult<{ filename: string; json: string }>> {
  await requireAdmin();
  try {
    const bundle = await exportDemoProfileBundle(profileId);
    return ok(bundle);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Export failed");
  }
}

export async function importDemoProfileBundleAction(
  json: string,
  slug?: string
): Promise<ActionResult<{ slug: string; id: ProfileId }>> {
  await requireAdmin();
  try {
    const data = parseSerializedDemoProfileJson(json);
    const resolvedSlug = slugifyProfileName(slug ?? data.meta.displayName);
    data.meta.id = customProfileId(resolvedSlug);
    await saveCustomDemoProfile(resolvedSlug, data);
    revalidatePath("/admin/demo-profiles");
    return ok({ slug: resolvedSlug, id: customProfileId(resolvedSlug) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Invalid profile bundle");
  }
}

export async function exportCurrentSiteProfileAction(
  slug: string,
  displayName?: string
): Promise<ActionResult<{ slug: string; id: ProfileId }>> {
  await requireAdmin();
  try {
    const resolvedSlug = slugifyProfileName(slug);
    const snapshot = await exportCurrentSiteAsProfile(resolvedSlug, displayName);
    await saveCustomDemoProfile(resolvedSlug, snapshot);
    revalidatePath("/admin/demo-profiles");
    return ok({ slug: resolvedSlug, id: customProfileId(resolvedSlug) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to export current site");
  }
}

export async function getDemoApplyPreviewAction(
  profileId: ProfileId
): Promise<ActionResult<DemoApplyPreview>> {
  await requireAdmin();
  try {
    const profile = await resolveProfileById(profileId);
    if (!profile) return fail("Profile not found");
    const wipeCounts = await getDemoApplyPreviewCounts();
    return ok({
      profileId,
      displayName: profile.meta.displayName,
      pageSlugs: profile.pages.map((p) => p.slug),
      wipeCounts,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load preview");
  }
}

export async function applyDemoProfileAction(input: {
  profileId: ProfileId;
  confirmPhrase: string;
  overrides?: DemoImportOverrides;
}): Promise<ActionResult> {
  await requireAdmin();
  if (input.confirmPhrase.trim().toUpperCase() !== "APPLY") {
    return fail('Type APPLY to confirm');
  }
  const startedAt = Date.now();
  try {
    const profile = await resolveProfileById(input.profileId);
    if (!profile) return fail("Profile not found");

    await importDemoProfileById(prisma, input.profileId, input.overrides ?? {});

    // #region agent log
    const { debugIngest } = await import("@/lib/debug-ingest");
    debugIngest(
      "demo-import/actions.ts:applyDemoProfileAction",
      "demo apply import finished",
      { profileId: input.profileId, elapsedMs: Date.now() - startedAt },
      "H7",
    );
    // #endregion

    after(async () => {
      try {
        const { searchIndexer } = await import("@/features/search/search-indexer.service");
        await searchIndexer.rebuildAll();
      } catch (e) {
        console.warn("[demo-import] deferred search rebuild failed:", e);
      }
    });

    for (const page of profile.pages) {
      revalidateWiredMarketingPaths(page.slug);
    }

    const cookieStore = await cookies();
    cookieStore.set("theme-reset", "1", {
      maxAge: 120,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });
    revalidatePath("/admin/demo-profiles");
    revalidatePath("/");
    return ok();
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    // #region agent log
    import("@/lib/debug-ingest").then(({ debugIngest }) =>
      debugIngest(
        "demo-import/actions.ts:applyDemoProfileAction",
        "demo apply failed",
        { profileId: input.profileId, error: errMsg.slice(0, 300), elapsedMs: Date.now() - startedAt },
        "H7",
      ),
    );
    // #endregion
    return fail(e instanceof Error ? e.message : "Failed to apply demo profile");
  }
}
