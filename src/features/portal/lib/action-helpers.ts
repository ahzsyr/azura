export function checkboxValue(raw: FormDataEntryValue | null): boolean {
  return raw === "true" || raw === "on" || raw === "1";
}

export function optionalText(raw: FormDataEntryValue | null): string | null {
  const value = (raw as string | null)?.trim();
  return value || null;
}
