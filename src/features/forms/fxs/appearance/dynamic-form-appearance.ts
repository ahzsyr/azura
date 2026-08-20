import { z } from "zod";

const radiusEnum = z.enum(["none", "sm", "md", "lg", "xl", "full"]);
const sizeEnum = z.enum(["sm", "md", "lg"]);
const paddingEnum = z.enum(["sm", "md", "lg"]);
const shadowEnum = z.enum(["none", "sm", "md", "lg"]);
const columnRatioEnum = z.enum(["50/50", "40/60", "60/40", "30/70", "70/30", "stacked"]);

/**
 * Shared form appearance controls — compose into any form block schema
 * (contactFormBuilder, leadForm, newsletterSignup, etc.).
 */
export const dynamicFormAppearanceSchema = z.object({
  // Header
  formIcon: z.string().default(""),
  iconPosition: z.enum(["left", "top"]).default("left"),
  subtitle: z.string().default(""),
  description: z.string().default(""),
  badge: z.string().default(""),

  // Field appearance
  fieldRadius: radiusEnum.default("md"),
  fieldHeight: sizeEnum.default("md"),
  fieldPadding: paddingEnum.default("md"),
  borderWidth: z.enum(["1", "2", "3"]).default("1"),
  focusColor: z.string().default(""),
  labelPosition: z.enum(["top", "floating", "hidden"]).default("top"),
  inputSize: sizeEnum.default("md"),

  // Submit button
  buttonText: z.string().default(""),
  buttonIcon: z.string().default(""),
  buttonIconPosition: z.enum(["left", "right"]).default("right"),
  buttonRadius: radiusEnum.default("full"),
  buttonSize: sizeEnum.default("md"),
  buttonWidth: z.enum(["auto", "full"]).default("full"),
  buttonAlignment: z.enum(["left", "center", "right"]).default("center"),
  loadingText: z.string().default(""),
  successText: z.string().default(""),
  errorText: z.string().default(""),

  // Form container
  containerBackground: z.string().default(""),
  containerBorderRadius: radiusEnum.default("xl"),
  containerShadow: shadowEnum.default("none"),
  containerPadding: z.enum(["none", "sm", "md", "lg", "xl"]).default("lg"),
  titleAlignment: z.enum(["left", "center", "right"]).default("left"),
  maxWidth: z.string().default(""),

  // Layout
  desktopLayout: columnRatioEnum.default("stacked"),
  tabletLayout: z.enum(["stacked", "sideBySide"]).default("stacked"),
});

export type DynamicFormAppearance = z.infer<typeof dynamicFormAppearanceSchema>;

const RADIUS_CSS: Record<string, string> = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
};

const HEIGHT_CSS: Record<string, string> = {
  sm: "2rem",
  md: "2.5rem",
  lg: "3rem",
};

const PADDING_CSS: Record<string, string> = {
  none: "0",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
};

const SHADOW_CSS: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
};

/** Map appearance props to CSS custom properties for FieldWrapper / FormShell. */
export function appearanceToCssVars(
  appearance: Partial<DynamicFormAppearance>,
): Record<string, string> {
  const vars: Record<string, string> = {};
  if (appearance.fieldRadius) {
    vars["--fxs-field-radius"] = RADIUS_CSS[appearance.fieldRadius] ?? "0.5rem";
  }
  if (appearance.fieldHeight) {
    vars["--fxs-field-height"] = HEIGHT_CSS[appearance.fieldHeight] ?? "2.5rem";
  }
  if (appearance.fieldPadding) {
    vars["--fxs-field-padding"] = PADDING_CSS[appearance.fieldPadding] ?? "1rem";
  }
  if (appearance.borderWidth) {
    vars["--fxs-border-width"] = `${appearance.borderWidth}px`;
  }
  if (appearance.focusColor) {
    vars["--fxs-focus-color"] = appearance.focusColor;
  }
  if (appearance.labelPosition) {
    vars["--fxs-label-position"] = appearance.labelPosition;
  }
  if (appearance.buttonRadius) {
    vars["--fxs-btn-radius"] = RADIUS_CSS[appearance.buttonRadius] ?? "9999px";
  }
  if (appearance.buttonSize) {
    vars["--fxs-btn-size"] = appearance.buttonSize;
  }
  if (appearance.containerBackground) {
    vars["--fxs-container-bg"] = appearance.containerBackground;
  }
  if (appearance.containerBorderRadius) {
    vars["--fxs-container-radius"] =
      RADIUS_CSS[appearance.containerBorderRadius] ?? "1rem";
  }
  if (appearance.containerShadow) {
    vars["--fxs-container-shadow"] = SHADOW_CSS[appearance.containerShadow] ?? "none";
  }
  if (appearance.containerPadding) {
    vars["--fxs-container-padding"] =
      PADDING_CSS[appearance.containerPadding] ?? "1.5rem";
  }
  return vars;
}
