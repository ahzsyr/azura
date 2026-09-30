/**
 * FXS feature flags — colocated with the forms experience layer.
 * Defaults favor enabling FXS for public forms while keeping advanced
 * capabilities gated until qa gates pass.
 */
export function isFxsEnvEnabled(name: string, defaultValue = false): boolean {
  if (typeof process === "undefined") return defaultValue;
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** Master switch — when true, public forms render through FXS shells. */
export function isFxsEnabled(): boolean {
  return isFxsEnvEnabled("NEXT_PUBLIC_FXS_ENABLED", true);
}

/** Use FXS field wrappers / theme tokens in schema runtime bindings. */
export function isFxsFieldExperienceEnabled(): boolean {
  return isFxsEnabled() && isFxsEnvEnabled("NEXT_PUBLIC_FXS_FIELD_EXPERIENCE", true);
}

/** Smart input adapters (phone/email/country/company). */
export function isFxsSmartInputsEnabled(): boolean {
  return isFxsEnabled() && isFxsEnvEnabled("NEXT_PUBLIC_FXS_SMART_INPUTS", false);
}

/** Enhanced drag-drop upload experience. */
export function isFxsUploadExperienceEnabled(): boolean {
  return isFxsEnabled() && isFxsEnvEnabled("NEXT_PUBLIC_FXS_UPLOADS", true);
}

/** Live summary panel on multi-step desktop layouts. */
export function isFxsLiveSummaryEnabled(): boolean {
  return isFxsEnabled() && isFxsEnvEnabled("NEXT_PUBLIC_FXS_LIVE_SUMMARY", true);
}

/** Conversational one-question layout. */
export function isFxsConversationalEnabled(): boolean {
  return isFxsEnabled() && isFxsEnvEnabled("NEXT_PUBLIC_FXS_CONVERSATIONAL", false);
}
