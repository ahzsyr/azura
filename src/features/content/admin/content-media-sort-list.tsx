"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContentItemMediaAdmin } from "@/features/content/types";
import {
  deleteContentItemMedia,
  reorderContentItemMedia,
  updateContentItemMedia,
} from "@/features/content/actions";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  itemId: string;
  media: ContentItemMediaAdmin[];
};

export function ContentMediaSortList({ itemId, media }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refresh = () => router.refresh();

  if (media.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No images yet. Use the Add Media tab to upload or pick from the library.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {media.map((item, index) => (
        <div key={item.id} className="rounded-lg border bg-card p-3">
          <div className="flex items-start gap-3">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
              <img src={item.url} alt={item.altEn || "Image"} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                {item.isCover ? <Badge className="text-[10px]">Cover</Badge> : null}
                {!item.isPublished ? <Badge variant="secondary" className="text-[10px]">Hidden</Badge> : null}
                {item.isHidden ? <Badge variant="outline" className="text-[10px]">Gallery off</Badge> : null}
              </div>
              <form
                action={async (fd) => {
                  await updateContentItemMedia(item.id, {
                    altEn: String(fd.get("altEn") ?? ""),
                    altAr: String(fd.get("altAr") ?? ""),
                    captionEn: String(fd.get("captionEn") ?? ""),
                    isPublished: fd.get("isPublished") === "on",
                    isHidden: fd.get("isHidden") === "on",
                    isCover: fd.get("isCover") === "on",
                  });
                  refresh();
                }}
                className="grid gap-2 md:grid-cols-2"
              >
                <div className="md:col-span-2">
                  <AdminLocalizedFormField
                    fieldKey="alt"
                    label="Alt"
                    legacyEntity={{ altEn: item.altEn, altAr: item.altAr }}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Caption</Label>
                  <Input name="captionEn" defaultValue={item.captionEn} className="h-8 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isCover" defaultChecked={item.isCover} />
                  Cover
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isPublished" defaultChecked={item.isPublished} />
                  Published
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isHidden" defaultChecked={item.isHidden} />
                  Hide in gallery
                </label>
                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" size="sm" disabled={pending}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("Remove this image?")) return;
                      startTransition(async () => {
                        await deleteContentItemMedia(item.id);
                        refresh();
                      });
                    }}
                  >
                    Delete
                  </Button>
                  {index > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const ids = [...media.map((m) => m.id)];
                        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]!];
                        startTransition(async () => {
                          await reorderContentItemMedia(itemId, ids);
                          refresh();
                        });
                      }}
                    >
                      Move up
                    </Button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
