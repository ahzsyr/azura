"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Pencil,
  Trash2,
  ArrowUp,
  Eye,
  EyeOff,
  Star,
  X,
  Check,
} from "lucide-react";
import type { ContentItemMediaAdmin } from "@/features/content/types";
import {
  addContentItemMedia,
  deleteContentItemMedia,
  reorderContentItemMedia,
  updateContentItemMedia,
} from "@/features/content/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MediaPickerDialog, MediaPickerTriggerButton } from "@/features/media/components/media-picker-dialog";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { LocalUploadDropzone } from "@/features/media/components/local-upload-dropzone";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { cn } from "@/lib/utils";

type Props = {
  itemId: string;
  media: ContentItemMediaAdmin[];
};

type EditingMedia = ContentItemMediaAdmin & { index: number };

export function ContentMediaPanel({ itemId, media }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<EditingMedia | null>(null);
  const [linkUrl, setLinkUrl] = useState("");

  const refresh = () => router.refresh();

  const handleAddUrl = () => {
    const url = linkUrl.trim();
    if (!url) return;
    startTransition(async () => {
      await addContentItemMedia(itemId, url);
      setLinkUrl("");
      setAddOpen(false);
      refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remove this image?")) return;
    startTransition(async () => {
      await deleteContentItemMedia(id);
      refresh();
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const ids = media.map((m) => m.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]!];
    startTransition(async () => {
      await reorderContentItemMedia(itemId, ids);
      refresh();
    });
  };

  const handleEditSave = async (fd: FormData) => {
    if (!editItem) return;
    await updateContentItemMedia(editItem.id, {
      altEn: String(fd.get("altEn") ?? ""),
      altAr: String(fd.get("altAr") ?? ""),
      captionEn: String(fd.get("captionEn") ?? ""),
      isPublished: fd.get("isPublished") === "on",
      isHidden: fd.get("isHidden") === "on",
      isCover: fd.get("isCover") === "on",
    });
    setEditItem(null);
    refresh();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {media.length} image{media.length !== 1 ? "s" : ""}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={pending}
        >
          <ImagePlus className="h-3.5 w-3.5 me-1.5" />
          Add media
        </Button>
      </div>

      {/* Media table */}
      {media.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No images yet.</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Click Add media to upload or choose from the library.
          </p>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Add media
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground w-16">
                  #
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground">
                  Image
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground hidden sm:table-cell">
                  Alt / Caption
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground hidden md:table-cell">
                  Status
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {media.map((m, index) => (
                <tr
                  key={m.id}
                  className={cn(
                    "border-b last:border-0 hover:bg-muted/20 transition-colors",
                  )}
                >
                  {/* Order */}
                  <td className="px-4 py-3 text-xs text-muted-foreground w-16">
                    {index + 1}
                  </td>

                  {/* Thumbnail */}
                  <td className="px-3 py-3">
                    <div className="h-12 w-16 overflow-hidden rounded-md bg-muted shrink-0">
                      <img
                        src={m.url}
                        alt={m.altEn || ""}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </td>

                  {/* Alt / Caption */}
                  <td className="px-3 py-3 hidden sm:table-cell max-w-[200px]">
                    <p className="text-xs font-medium truncate">{m.altEn || <span className="text-muted-foreground italic">No alt</span>}</p>
                    {m.captionEn && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{m.captionEn}</p>
                    )}
                  </td>

                  {/* Status badges */}
                  <td className="px-3 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {m.isCover && (
                        <Badge className="text-[10px] h-4 px-1.5 gap-0.5">
                          <Star className="h-2.5 w-2.5" /> Cover
                        </Badge>
                      )}
                      {m.isPublished ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                          <Eye className="h-2.5 w-2.5" /> Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                          <EyeOff className="h-2.5 w-2.5" /> Hidden
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {index > 0 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Move up"
                          disabled={pending}
                          onClick={() => handleMoveUp(index)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => setEditItem({ ...m, index })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Delete"
                        disabled={pending}
                        onClick={() => handleDelete(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add media dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add media</DialogTitle>
            <DialogDescription>
              Upload a new file, add from a URL, or pick from the media library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* URL */}
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Add from URL</p>
              <UrlPrimaryMediaPickerField
                label=""
                url={linkUrl}
                onChange={setLinkUrl}
                mediaTypes={["IMAGE", "SVG"]}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddUrl}
                disabled={pending || !linkUrl.trim()}
              >
                {pending ? "Adding…" : "Add image"}
              </Button>
            </div>

            {/* Upload */}
            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <p className="text-sm font-medium">Upload file</p>
              <LocalUploadDropzone
                uploadType="IMAGE"
                onUploadComplete={async (results) => {
                  for (const file of results) {
                    await addContentItemMedia(itemId, file.url);
                  }
                  setAddOpen(false);
                  refresh();
                }}
              />
            </div>

            {/* Library */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Media library</p>
              <MediaPickerDialog
                mediaTypes={["IMAGE", "SVG"]}
                onSelect={async (asset) => {
                  await addContentItemMedia(itemId, asset.url);
                  setAddOpen(false);
                  refresh();
                }}
                trigger={<MediaPickerTriggerButton label="Choose from media library" />}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit media dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit image</DialogTitle>
          </DialogHeader>
          {editItem && (
            <form
              action={async (fd) => { await handleEditSave(fd); }}
              className="space-y-4 pt-2"
            >
              {/* Preview */}
              <div className="h-32 w-full overflow-hidden rounded-lg bg-muted">
                <img
                  src={editItem.url}
                  alt={editItem.altEn || ""}
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Alt text */}
              <AdminLocalizedFormField
                fieldKey="alt"
                label="Alt text"
                legacyEntity={{ altEn: editItem.altEn, altAr: editItem.altAr }}
              />

              {/* Caption */}
              <div className="space-y-1.5">
                <Label className="text-sm">Caption</Label>
                <Input name="captionEn" defaultValue={editItem.captionEn} />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isCover" defaultChecked={editItem.isCover} />
                  Cover image
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isPublished" defaultChecked={editItem.isPublished} />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isHidden" defaultChecked={editItem.isHidden} />
                  Hide in gallery
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditItem(null)}
                >
                  <X className="h-3.5 w-3.5 me-1" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  <Check className="h-3.5 w-3.5 me-1" />
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
