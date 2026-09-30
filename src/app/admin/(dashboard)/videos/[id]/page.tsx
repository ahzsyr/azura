import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { VideoForm } from "@/features/videos/admin/video-form";
import { videoService } from "@/features/videos/video.service";

type Props = { params: Promise<{ id: string }> };

export default async function AdminVideoEditPage({ params }: Props) {
  const { id } = await params;
  let video = null;
  try {
    video = await videoService.getAdminById(id);
  } catch {
    // DB not connected
  }
  if (!video) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Edit video" description={video.slug} />
      <VideoForm video={video} />
    </div>
  );
}
