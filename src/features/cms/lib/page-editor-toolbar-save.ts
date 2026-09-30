import type { UpsertCmsPageResult } from "@/features/cms/actions";

export type PageEditorToolbarSaveFn = (formData: FormData) => Promise<UpsertCmsPageResult>;

/** Full upsert path — syncs EntityTranslation for page fields and blocks. */
export async function runPageEditorToolbarSave(
  formData: FormData,
  save: PageEditorToolbarSaveFn,
): Promise<UpsertCmsPageResult> {
  return save(formData);
}
