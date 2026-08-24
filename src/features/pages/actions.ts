"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { collectionsApiService } from "@/features/collections/collections-api.service";

export async function publishCategoryPage(slug: string) {
  await requireAdmin();
  const result = await collectionsApiService.updateCollection({
    originalSlug: slug,
    slug,
    visible: true,
  });
  if ("error" in result && result.error) {
    throw new Error(result.error);
  }
  revalidatePath("/admin/pages");
  revalidatePath("/admin/categories");
}

export async function unpublishCategoryPage(slug: string) {
  await requireAdmin();
  const result = await collectionsApiService.updateCollection({
    originalSlug: slug,
    slug,
    visible: false,
  });
  if ("error" in result && result.error) {
    throw new Error(result.error);
  }
  revalidatePath("/admin/pages");
  revalidatePath("/admin/categories");
}
