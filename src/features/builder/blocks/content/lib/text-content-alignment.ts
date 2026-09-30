export type TextContentAlignment = "left" | "right" | "center" | "justify";

export function normalizeTextContentAlignment(
  value: string | null | undefined,
): TextContentAlignment {
  switch (value) {
    case "start":
    case "left":
      return "left";
    case "end":
    case "right":
      return "right";
    case "center":
      return "center";
    case "justify":
      return "justify";
    default:
      return "left";
  }
}

export function getTextContentAlignClass(value: string | null | undefined): string {
  switch (normalizeTextContentAlignment(value)) {
    case "center":
      return "text-center";
    case "right":
      return "text-end";
    case "justify":
      return "text-justify";
    case "left":
    default:
      return "text-start";
  }
}
