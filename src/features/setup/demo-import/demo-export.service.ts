import { prisma } from "@/lib/prisma";
import { getSerializedProfileById } from "./demo-profile-registry.service";
import { exportLiveSiteSnapshot } from "./demo-live-export.service";
import type { ProfileId } from "./profile-id";
import type { SerializedDemoProfile } from "./serialized-profile.schema";

export async function exportDemoProfileBundle(
  profileId: ProfileId
): Promise<{ filename: string; json: string }> {
  const profile = await getSerializedProfileById(profileId);
  if (!profile) throw new Error("Profile not found");

  const filename = `${slugifyFilename(profile.meta.displayName)}-demo.json`;
  return {
    filename,
    json: JSON.stringify(profile, null, 2),
  };
}

export async function exportCurrentSiteAsProfile(
  slug: string,
  displayName?: string
): Promise<SerializedDemoProfile> {
  return exportLiveSiteSnapshot(slug, displayName);
}

function slugifyFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "demo-profile";
}

export async function getDemoApplyPreviewCounts() {
  const [posts, forms, faqs, testimonials, galleries, contentItems, mediaAssets] =
    await Promise.all([
      prisma.post.count(),
      prisma.formTemplate.count(),
      prisma.faqSet.count(),
      prisma.testimonial.count(),
      prisma.gallery.count(),
      prisma.contentItem.count(),
      prisma.mediaAsset.count(),
    ]);
  return { posts, forms, faqs, testimonials, galleries, contentItems, mediaAssets };
}
