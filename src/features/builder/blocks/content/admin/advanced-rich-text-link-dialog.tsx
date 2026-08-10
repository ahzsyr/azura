"use client";

import { useState } from "react";
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

type Props = {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdvancedRichTextLinkDialog({ editor, open, onOpenChange }: Props) {
  const existing = editor?.getAttributes("link") ?? {};
  const [url, setUrl] = useState((existing.href as string) || "");
  const [openInNewTab, setOpenInNewTab] = useState(existing.target === "_blank");

  const handleOpen = (next: boolean) => {
    if (next && editor) {
      const attrs = editor.getAttributes("link");
      setUrl((attrs.href as string) || "");
      setOpenInNewTab(attrs.target === "_blank");
    }
    onOpenChange(next);
  };

  const apply = () => {
    if (!editor || !url.trim()) return;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: url.trim(),
        target: openInNewTab ? "_blank" : null,
        rel: openInNewTab ? "noopener noreferrer" : null,
      })
      .run();
    onOpenChange(false);
  };

  const remove = () => {
    editor?.chain().focus().unsetLink().run();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert link</DialogTitle>
          <DialogDescription className="sr-only">Insert or edit a hyperlink</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="link-url" className="text-xs">
              URL
            </Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => setOpenInNewTab(e.target.checked)}
            />
            Open in new tab
          </label>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {editor?.isActive("link") && (
            <Button type="button" variant="outline" onClick={remove}>
              Remove link
            </Button>
          )}
          <Button type="button" onClick={apply} disabled={!url.trim()}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
