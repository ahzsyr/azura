import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { usersService } from "@/features/account/users.service";
import { UsersListPage } from "@/features/account/admin/users-list-page";

type Props = { searchParams: Promise<{ search?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }
  const { search } = await searchParams;
  const users = await usersService.listCustomers();
  return <UsersListPage users={users} initialSearch={search ?? ""} />;
}
