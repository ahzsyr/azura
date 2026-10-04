import "server-only";

import { draftMode } from "next/headers";

/** Enable Next.js Draft Mode for unpublished CMS preview. */
export async function enableCmsDraftMode(): Promise<void> {
  const draft = await draftMode();
  draft.enable();
}

/** Disable Draft Mode (exit preview). */
export async function disableCmsDraftMode(): Promise<void> {
  const draft = await draftMode();
  draft.disable();
}

export async function isCmsDraftModeEnabled(): Promise<boolean> {
  const draft = await draftMode();
  return draft.isEnabled;
}
