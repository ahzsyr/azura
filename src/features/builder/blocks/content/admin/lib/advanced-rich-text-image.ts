import Image from "@tiptap/extension-image";

export const IMAGE_ALIGN = {
  INLINE: "inline",
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
} as const;

export type ImageAlign = (typeof IMAGE_ALIGN)[keyof typeof IMAGE_ALIGN];

export const WIDTH_PRESETS = ["25%", "50%", "75%", "100%"] as const;
export type ImageWidth = (typeof WIDTH_PRESETS)[number] | null;

function buildStyle(align: ImageAlign, width: ImageWidth): string {
  const w = width ? `width: ${width}; max-width: ${width};` : "";
  switch (align) {
    case IMAGE_ALIGN.INLINE:
      return `display: inline-block; vertical-align: middle; max-width: 100%; height: auto; ${w}`;
    case IMAGE_ALIGN.LEFT:
      return `float: left; margin: 0 1rem 1rem 0; ${w}`;
    case IMAGE_ALIGN.RIGHT:
      return `float: right; margin: 0 0 1rem 1rem; ${w}`;
    case IMAGE_ALIGN.CENTER:
    default:
      return `display: block; margin-left: auto; margin-right: auto; ${w}`;
  }
}

export const ImageWithAlign = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: IMAGE_ALIGN.CENTER as ImageAlign,
        parseHTML: (element) => (element.getAttribute("data-align") as ImageAlign) || IMAGE_ALIGN.CENTER,
        renderHTML: (attributes) => {
          const align = (attributes.align as ImageAlign) || IMAGE_ALIGN.CENTER;
          const width = (attributes.width as ImageWidth) || null;
          return {
            "data-align": align,
            style: buildStyle(align, width),
          };
        },
      },
      width: {
        default: null as ImageWidth,
        parseHTML: (element) => (element.getAttribute("data-width") as ImageWidth) || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { "data-width": attributes.width };
        },
      },
    };
  },
});
