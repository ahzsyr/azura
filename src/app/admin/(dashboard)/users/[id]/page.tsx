import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/settings/users/${id}`);
}
