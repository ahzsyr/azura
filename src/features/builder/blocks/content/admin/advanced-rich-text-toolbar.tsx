"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Eraser,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  Strikethrough,
  Table,
  Underline,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ToolbarButton,
  ToolbarDivider,
  ToolbarGroup,
  ToolbarSelect,
  FORMAT_OPTIONS,
  getActiveFormat,
  applyFormat,
} from "@/features/builder/blocks/content/admin/advanced-rich-text-toolbar-groups";
import { AdvancedRichTextColorPicker } from "@/features/builder/blocks/content/admin/advanced-rich-text-color-picker";
import { AdvancedRichTextTableMenu } from "@/features/builder/blocks/content/admin/advanced-rich-text-table-menu";
import { AlignMenu, ListsMenu } from "@/features/builder/blocks/content/admin/advanced-rich-text-toolbar-menus";
import { clearFormatting } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-commands";

type Props = {
  editor: Editor;
  onOpenLink: () => void;
  onOpenImage: () => void;
};

export function AdvancedRichTextToolbar({ editor, onOpenLink, onOpenImage }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1">
          {/* Heading select */}
          <ToolbarSelect
            aria-label="Paragraph style"
            value={getActiveFormat(editor)}
            onChange={(v) => applyFormat(editor, v)}
            options={FORMAT_OPTIONS}
            className="w-28"
          />

          <ToolbarDivider />

          {/* Inline formatting */}
          <ToolbarGroup>
            <ToolbarButton
              icon={Bold}
              label="Bold"
              shortcut="Ctrl+B"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              icon={Italic}
              label="Italic"
              shortcut="Ctrl+I"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              icon={Underline}
              label="Underline"
              shortcut="Ctrl+U"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              icon={Strikethrough}
              label="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Colors + Clear */}
          <ToolbarGroup>
            <AdvancedRichTextColorPicker editor={editor} mode="text" />
            <AdvancedRichTextColorPicker editor={editor} mode="highlight" />
            <ToolbarButton icon={Eraser} label="Clear formatting" onClick={() => clearFormatting(editor)} />
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Align + Lists + Indent */}
          <ToolbarGroup>
            <AlignMenu editor={editor} />
            <ListsMenu editor={editor} />
            <ToolbarButton
              icon={IndentDecrease}
              label="Decrease indent"
              onClick={() => editor.chain().focus().decreaseIndent().run()}
            />
            <ToolbarButton
              icon={IndentIncrease}
              label="Increase indent"
              onClick={() => editor.chain().focus().increaseIndent().run()}
            />
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Insert */}
          <ToolbarGroup>
            <ToolbarButton
              icon={Link2}
              label="Link"
              active={editor.isActive("link")}
              onClick={onOpenLink}
            />
            <ToolbarButton icon={ImageIcon} label="Image" onClick={onOpenImage} />
            <AdvancedRichTextTableMenu editor={editor} />
          </ToolbarGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}
