"use client";

import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Images } from "lucide-react";
import { useState, useTransition } from "react";
import type { GalleryAlbumAdmin } from "@/features/gallery/types";
import {
  deleteGallery,
  reorderGalleries,
  toggleGalleryPublished,
} from "@/features/gallery/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  albums: GalleryAlbumAdmin[];
};

function SortableAlbumCard({
  album,
  onChanged,
}: {
  album: GalleryAlbumAdmin;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const togglePublished = () => {
    startTransition(async () => {
      await toggleGalleryPublished(album.id, !album.isPublished);
      onChanged();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete gallery "${album.titleEn}" and all its media?`)) return;
    startTransition(async () => {
      await deleteGallery(album.id);
      onChanged();
    });
  };

  const thumb = album.previewUrl ?? album.coverUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-xl border bg-card overflow-hidden", isDragging && "opacity-50")}
    >
      <div className="relative aspect-video bg-muted">
        {thumb ? (
          <img src={thumb} alt={album.titleEn} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Images className="h-10 w-10 opacity-40" />
          </div>
        )}
        <button
          type="button"
          className="absolute start-2 top-2 cursor-grab touch-none rounded-md bg-background/80 p-1"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{album.titleEn}</h3>
            {!album.isPublished && (
              <Badge variant="secondary" className="text-[10px]">
                Hidden
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {album.mediaCount} item{album.mediaCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          <Button asChild size="sm">
            <Link href={`/admin/gallery/${album.id}`}>Manage</Link>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={togglePublished} disabled={pending}>
            {album.isPublished ? "Hide" : "Show"}
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={pending}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GalleryManager({ albums: initialAlbums }: Props) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [pending, startTransition] = useTransition();

  const refreshFromServer = () => {
    startTransition(() => {
      window.location.reload();
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = albums.findIndex((a) => a.id === active.id);
    const newIndex = albums.findIndex((a) => a.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(albums, oldIndex, newIndex);
    setAlbums(reordered);
    startTransition(async () => {
      await reorderGalleries(reordered.map((a) => a.id));
    });
  };

  return (
    <div>
      <AdminPageHeader
        title="Galleries"
        description="Create albums and manage photos and videos inside each gallery."
        actions={
          <Button asChild>
            <Link href="/admin/gallery/new">Add Gallery</Link>
          </Button>
        }
      />

      {albums.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Images className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No galleries yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first gallery to start adding media.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/gallery/new">Add Gallery</Link>
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={albums.map((a) => a.id)} strategy={rectSortingStrategy}>
            <AdminCardGrid columns={3} className={cn(pending && "opacity-80")}>
              {albums.map((album) => (
                <SortableAlbumCard key={album.id} album={album} onChanged={refreshFromServer} />
              ))}
            </AdminCardGrid>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
