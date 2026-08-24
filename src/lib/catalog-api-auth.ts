import { assertRole } from "@/lib/api-auth";

export async function requireCatalogAdmin() {
  const result = await assertRole("ADMIN");
  if ("error" in result) return result.error;
  return null;
}
