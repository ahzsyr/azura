export const DEMO_PROFILES_NAMESPACE = "demo-profiles" as const;

export type BuiltinProfileId = "demo-brt" | "demo-safar";
export type ProfileId = BuiltinProfileId | `custom:${string}`;

export function isCustomProfileId(id: string): id is `custom:${string}` {
  return id.startsWith("custom:");
}

export function customProfileSlug(id: ProfileId): string {
  return id.replace(/^custom:/, "");
}

export function customProfileId(slug: string): ProfileId {
  return `custom:${slug}`;
}

export function isBuiltinProfileId(id: string): id is BuiltinProfileId {
  return id === "demo-brt" || id === "demo-safar";
}

export function slugifyProfileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "demo-copy";
}
