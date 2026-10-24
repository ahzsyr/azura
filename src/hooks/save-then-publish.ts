import { useAdminUiStore } from "@/stores/admin-ui-store";

/**
 * Persist a dirty form before running the page publish handler.
 * A clean form skips save and publishes the stored version.
 */
export async function saveIfNeededThenPublish(
  save: () => boolean | void | Promise<boolean | void>,
  publish: () => Promise<unknown>,
): Promise<void> {
  const status = useAdminUiStore.getState().saveStatus;
  if (status === "unsaved" || status === "error") {
    const ok = await save();
    if (ok === false) {
      throw new Error("Save failed");
    }
  }
  await publish();
}
