"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Film, Plus } from "lucide-react";
import type { VideoAdmin } from "@/features/videos/types";
import { deleteVideo, toggleVideoPublished } from "@/features/videos/actions";
import { AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  videos: VideoAdmin[];
};

export function VideoManager({ videos: initial }: Props) {
  const router = useRouter();
  const [videos, setVideos] = useState(initial);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(() => {
      router.refresh();
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Videos"
        description="Manage watch-page videos (MP4 + JPG/PNG poster)."
        actions={
          <Button asChild>
            <Link href="/admin/videos/new">
              <Plus className="me-1 h-4 w-4" />
              New video
            </Link>
          </Button>
        }
      />

      {videos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Film className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>No videos yet.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/admin/videos/new">Create first video</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {videos.map((video) => (
            <li key={video.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                {video.thumbnailMedia?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnailMedia.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/videos/${video.id}`}
                    className="font-medium hover:underline"
                  >
                    {video.title}
                  </Link>
                  <Badge variant={video.status === "PUBLISHED" ? "default" : "secondary"}>
                    {video.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  /videos/{video.slug}
                  {video.duration ? ` · ${video.duration}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/videos/${video.id}`}>Edit</Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await toggleVideoPublished(video.id, video.status !== "PUBLISHED");
                      refresh();
                    });
                  }}
                >
                  {video.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete video "${video.title}"?`)) return;
                    startTransition(async () => {
                      await deleteVideo(video.id);
                      setVideos((prev) => prev.filter((v) => v.id !== video.id));
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
