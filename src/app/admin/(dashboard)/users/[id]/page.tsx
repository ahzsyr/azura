import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { usersService } from "@/features/account/users.service";
import { UserDetailForm } from "@/features/account/admin/user-detail-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }
  const { id } = await params;
  const user = await usersService.getCustomerById(id);
  if (!user) notFound();
  return <UserDetailForm user={user} />;
}
