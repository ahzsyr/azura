import { VideoManager } from "@/features/videos/admin/video-manager";
import { videoService } from "@/features/videos/video.service";
import type { VideoAdmin } from "@/features/videos/types";

export default async function AdminVideosPage() {
  let videos: VideoAdmin[] = [];
  try {
    videos = await videoService.listAdmin();
  } catch {
    // DB not connected / table missing until migrate
  }
  return <VideoManager videos={videos} />;
}
