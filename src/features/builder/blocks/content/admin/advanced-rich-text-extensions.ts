import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TableWithWidth } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CharacterCount from "@tiptap/extension-character-count";
import type { Extensions } from "@tiptap/core";
import { HeadingWithAnchor } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-heading";
import { ImageWithAlign } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-image";
import { IndentExtension } from "@/features/builder/blocks/content/admin/lib/advanced-rich-text-indent";

export function createAdvancedRichTextExtensions(placeholder = "Write content…"): Extensions {
  return [
    // StarterKit v3 already bundles Underline and Link — no need to register them separately.
    StarterKit.configure({
      heading: false,
      link: {
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      },
    }),
    HeadingWithAnchor.configure({ levels: [1, 2, 3, 4] }),
    ImageWithAlign.configure({
      HTMLAttributes: { class: "rounded-md max-w-full h-auto" },
    }),
    TextAlign.configure({ types: ["heading", "paragraph", "listItem"] }),
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({ placeholder }),
    IndentExtension,
    TextStyle,
    Color,
    TableWithWidth.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount,
  ];
}
