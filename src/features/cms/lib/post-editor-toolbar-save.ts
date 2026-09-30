/** Posts use native form submit → upsertPost so entity + block translations sync. */
export function shouldPostEditorUsePatchSave(): boolean {
  return false;
}
