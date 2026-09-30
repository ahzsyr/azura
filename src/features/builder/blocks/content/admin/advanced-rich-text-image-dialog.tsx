"use client";

import type { Editor } from "@tiptap/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPickerDialog } from "@/features/media/components/media-picker-dialog";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { useEffect, useState } from "react";
import {
  IMAGE_ALIGN,
  WIDTH_PRESETS,
  type ImageAlign,
  type ImageWidth,
} from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-image";

type Props = {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdvancedRichTextImageDialog({ editor, open, onOpenChange }: Props) {
  const [alt, setAlt] = useState("");
  const [align, setAlign] = useState<ImageAlign>("center");
  const [width, setWidth] = useState<ImageWidth>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const editing = editor?.isActive("image") ?? false;

  useEffect(() => {
    if (!open || !editor) return;
    if (editor.isActive("image")) {
      const attrs = editor.getAttributes("image");
      setAlt((attrs.alt as string) || "");
      setAlign((attrs.align as ImageAlign) || "center");
      setWidth((attrs.width as ImageWidth) || null);
    } else {
      setAlt("");
      setAlign("center");
      setWidth(null);
    }
  }, [open, editor]);

  const insert = (url: string, altText: string) => {
    editor?.chain().focus().setImage({ src: url, alt: altText }).updateAttributes("image", { align, width }).run();
    onOpenChange(false);
    setAlt("");
    setAlign("center");
    setWidth(null);
  };

  const update = () => {
    editor?.chain().focus().updateAttributes("image", { alt: alt.trim(), align, width }).run();
    onOpenChange(false);
  };

  const insertFromUrl = () => {
    const url = window.prompt("Image URL");
    if (url) insert(url, alt.trim());
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Image properties" : "Insert image"}</DialogTitle>
            <DialogDescription className="sr-only">Insert or edit an image and set alignment and width</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="img-alt" className="text-xs">
                Alt text
              </Label>
              <Input
                id="img-alt"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="img-align" className="text-xs">
                Alignment
              </Label>
              <select
                id="img-align"
                value={align}
                onChange={(e) => setAlign(e.target.value as ImageAlign)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value={IMAGE_ALIGN.INLINE}>Inline with text</option>
                <option value={IMAGE_ALIGN.LEFT}>Left</option>
                <option value={IMAGE_ALIGN.CENTER}>Centered</option>
                <option value={IMAGE_ALIGN.RIGHT}>Right</option>
              </select>
            </div>
            <div>
              <Label htmlFor="img-width" className="text-xs">
                Width
              </Label>
              <select
                id="img-width"
                value={width ?? ""}
                onChange={(e) => setWidth((e.target.value as ImageWidth) || null)}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Auto</option>
                {WIDTH_PRESETS.map((w) => (
                  <option key={w} value={w}>
                    {w === "100%" ? "Full width" : w}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editing ? (
              <Button type="button" onClick={update}>
                Update image
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={insertFromUrl}>
                  From URL
                </Button>
                <Button type="button" onClick={() => setPickerOpen(true)}>
                  Media library
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
        onSelect={(asset) => insert(asset.url, alt.trim() || asset.altEn || asset.filename)}
      />
    </>
  );
}
