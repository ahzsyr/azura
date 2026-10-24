import { redirect } from "next/navigation";

export default function AdminStaffSettingsPage() {
  redirect("/admin/settings/users?role=admin");
}
