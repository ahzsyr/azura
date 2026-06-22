import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogProductsRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) query.append(key, entry);
    } else {
      query.set(key, value);
    }
  }
  const qs = query.toString();
  redirect(qs ? `/admin/products?${qs}` : "/admin/products");
}
