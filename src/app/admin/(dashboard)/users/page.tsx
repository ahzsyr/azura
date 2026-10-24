import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ search?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const { search } = await searchParams;
  const query = search?.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";
  redirect(`/admin/settings/users?role=customer${query}`);
}
