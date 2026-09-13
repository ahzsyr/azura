import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminGoogleTagsRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  params.set("tab", "analytics");
  const resolved = (await searchParams) ?? {};
  for (const [key, value] of Object.entries(resolved)) {
    if (key === "tab" || value == null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else {
      params.set(key, value);
    }
  }
  redirect(`/admin/seo/google?${params.toString()}`);
}
