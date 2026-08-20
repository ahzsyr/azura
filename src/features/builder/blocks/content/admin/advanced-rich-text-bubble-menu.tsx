"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ExternalLink,
  Eraser,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoveHorizontal,
  Pencil,
  Strikethrough,
  Trash2,
  Underline,
  Unlink,
} from "lucide-react";
import { ToolbarButton, ToolbarDivider } from "@/features/builder/blocks/content/admin/advanced-rich-text-toolbar-groups";
import { AdvancedRichTextColorPicker } from "@/features/builder/blocks/content/admin/advanced-rich-text-color-picker";
import { getSelectionContext } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-selection-context";
import { clearFormatting } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-commands";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  IMAGE_ALIGN,
  WIDTH_PRESETS,
  type ImageAlign,
  type ImageWidth,
} from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-image";

type Props = {
  editor: Editor;
  onOpenLink: () => void;
  onOpenImage: () => void;
};

export function AdvancedRichTextBubbleMenu({ editor, onOpenLink, onOpenImage }: Props) {
  const context = getSelectionContext(editor);

  const shouldShowText = ({ editor: ed }: { editor: Editor }) => {
    const { empty } = ed.state.selection;
    if (empty) return false;
    return !ed.isActive("image") && !ed.isActive("table");
  };

  const openLinkInNewTab = () => {
    const href = editor.getAttributes("link").href as string;
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };

  // ── Image context ──────────────────────────────────────────────
  if (context === "image") {
    const imgAttrs = editor.getAttributes("image");
    const currentAlign = (imgAttrs.align as ImageAlign) || "center";
    const currentWidth = (imgAttrs.width as ImageWidth) || null;

    const setAlign = (align: ImageAlign) =>
      editor.chain().focus().updateAttributes("image", { align }).run();
    const setWidth = (width: ImageWidth) =>
      editor.chain().focus().updateAttributes("image", { width }).run();

    return (
      <BubbleMenu editor={editor} className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md">
        <TooltipProvider delayDuration={200}>
          <ToolbarButton icon={MoveHorizontal} label="Inline with text" active={currentAlign === IMAGE_ALIGN.INLINE} onClick={() => setAlign(IMAGE_ALIGN.INLINE)} />
          <ToolbarButton icon={AlignLeft} label="Align left" active={currentAlign === IMAGE_ALIGN.LEFT} onClick={() => setAlign(IMAGE_ALIGN.LEFT)} />
          <ToolbarButton icon={AlignCenter} label="Centered" active={currentAlign === IMAGE_ALIGN.CENTER} onClick={() => setAlign(IMAGE_ALIGN.CENTER)} />
          <ToolbarButton icon={AlignRight} label="Align right" active={currentAlign === IMAGE_ALIGN.RIGHT} onClick={() => setAlign(IMAGE_ALIGN.RIGHT)} />
          <ToolbarDivider />
          {WIDTH_PRESETS.map((w) => (
            <Button
              key={w}
              type="button"
              size="sm"
              variant={currentWidth === w ? "secondary" : "ghost"}
              className="h-7 px-1.5 text-[10px] font-mono"
              onClick={() => setWidth(currentWidth === w ? null : w)}
            >
              {w}
            </Button>
          ))}
          <ToolbarDivider />
          <ToolbarButton icon={Pencil} label="Edit image" onClick={onOpenImage} />
          <ToolbarButton
            icon={Trash2}
            label="Delete image"
            onClick={() => editor.chain().focus().deleteSelection().run()}
          />
        </TooltipProvider>
      </BubbleMenu>
    );
  }

  // ── Table context ──────────────────────────────────────────────
  if (context === "table") {
    return (
      <BubbleMenu
        editor={editor}
        className="flex flex-wrap items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md max-w-[90vw]"
      >
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2"
          onClick={() => editor.chain().focus().addRowAfter().run()}>
          + Row
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2"
          onClick={() => editor.chain().focus().deleteRow().run()}>
          − Row
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2"
          onClick={() => editor.chain().focus().addColumnAfter().run()}>
          + Col
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2"
          onClick={() => editor.chain().focus().deleteColumn().run()}>
          − Col
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2"
          onClick={() => editor.chain().focus().mergeCells().run()}>
          Merge
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2"
          onClick={() => editor.chain().focus().splitCell().run()}>
          Split
        </Button>
      </BubbleMenu>
    );
  }

  // ── Link context ───────────────────────────────────────────────
  if (context === "link") {
    return (
      <BubbleMenu
        editor={editor}
        shouldShow={shouldShowText}
        className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
      >
        <TooltipProvider delayDuration={200}>
          <ToolbarButton icon={Link2} label="Edit link" onClick={onOpenLink} />
          <ToolbarButton icon={ExternalLink} label="Open link" onClick={openLinkInNewTab} />
          <ToolbarButton
            icon={Unlink}
            label="Remove link"
            onClick={() => editor.chain().focus().unsetLink().run()}
          />
        </TooltipProvider>
      </BubbleMenu>
    );
  }

  // ── Default text context ───────────────────────────────────────
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={shouldShowText}
      className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
    >
      <TooltipProvider delayDuration={200}>
        <ToolbarButton
          icon={Bold}
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={Italic}
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={Underline}
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          icon={Strikethrough}
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarDivider />
        <AdvancedRichTextColorPicker editor={editor} mode="text" />
        <AdvancedRichTextColorPicker editor={editor} mode="highlight" />
        <ToolbarDivider />
        <ToolbarButton
          icon={List}
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarDivider />
        <ToolbarButton
          icon={Link2}
          label="Link"
          active={editor.isActive("link")}
          onClick={onOpenLink}
        />
        <ToolbarButton
          icon={Eraser}
          label="Clear formatting"
          onClick={() => clearFormatting(editor)}
        />
      </TooltipProvider>
    </BubbleMenu>
  );
}
