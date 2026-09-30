import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { usersService } from "@/features/account/users.service";
import { UserDetailForm } from "@/features/account/admin/user-detail-form";
import { redirectUnlessAdmin } from "@/features/auth/redirect-unless-admin";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const session = await auth();
  const { id } = await params;
  redirectUnlessAdmin(session, `/admin/users/${id}`);
  const user = await usersService.getCustomerById(id);
  if (!user) notFound();
  return <UserDetailForm user={user} />;
}
