import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { VideoForm } from "@/features/videos/admin/video-form";

export default function AdminVideoNewPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="New video" description="Create a watch-page video entry." />
      <VideoForm />
    </div>
  );
}
