import { redirect } from "next/navigation";

export default function PresetsAdminPage() {
  redirect("/admin/theme?section=presets");
}
