export type PermissionStatus = "required" | "granted" | "missing" | "expired";

export type ProviderPermissionEntry = {
  scope: string;
  status: PermissionStatus;
  label?: string;
  capability?: string;
};

export type ProviderPermissionState = {
  providerId: string;
  connectionId: string;
  entries: ProviderPermissionEntry[];
  lastCheckedAt: string;
};

export function summarizePermissions(entries: ProviderPermissionEntry[]) {
  const granted = entries.filter((e) => e.status === "granted").map((e) => e.scope);
  const missing = entries.filter((e) => e.status === "missing" || e.status === "required").map((e) => e.scope);
  const expired = entries.filter((e) => e.status === "expired").map((e) => e.scope);
  return { granted, missing, expired, reconnectRequired: missing.length > 0 || expired.length > 0 };
}

export function buildPermissionEntries(
  requiredScopes: string[],
  grantedScopes: string[],
  expiredScopes: string[] = [],
): ProviderPermissionEntry[] {
  const granted = new Set(grantedScopes);
  const expired = new Set(expiredScopes);
  return requiredScopes.map((scope) => {
    if (expired.has(scope)) return { scope, status: "expired" as const };
    if (granted.has(scope)) return { scope, status: "granted" as const };
    return { scope, status: "missing" as const };
  });
}
