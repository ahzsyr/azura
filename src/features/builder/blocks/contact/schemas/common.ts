import { z } from "zod";

/** Shared contact theme — stored once on contactSection; children inherit via undefined overrides. */
export const contactThemeSchema = z.object({
  cardRadius: z.string().optional(),
  cardShadow: z.string().optional(),
  iconStyle: z.string().optional(),
  spacing: z.string().optional(),
  colors: z.record(z.string(), z.string()).optional(),
  buttonStyle: z.string().optional(),
  inputStyle: z.string().optional(),
});

export type ContactTheme = z.infer<typeof contactThemeSchema>;

/**
 * Base appearance for every contact card block.
 * Optional fields: `undefined` = inherit from ContactTheme, then fall back to defaults.
 */
export const contactCardBaseSchema = z.object({
  title: z.string().default(""),
  description: z.string().default(""),
  icon: z.string().default(""),
  iconPosition: z.enum(["left", "top", "right"]).optional(),
  iconStyle: z.enum(["plain", "circle", "rounded", "square"]).optional(),
  cardStyle: z.enum(["card", "flat", "bordered", "filled"]).optional(),
  borderRadius: z.enum(["none", "sm", "md", "lg", "xl", "full"]).optional(),
  shadow: z.enum(["none", "sm", "md", "lg"]).optional(),
  padding: z.enum(["none", "sm", "md", "lg", "xl"]).optional(),
  spacing: z.enum(["sm", "md", "lg"]).optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
  animation: z.enum(["none", "fadeIn", "slideUp"]).optional(),
});

export type ContactCardBase = z.infer<typeof contactCardBaseSchema>;

export type ResolvedContactCardAppearance = {
  iconPosition: "left" | "top" | "right";
  iconStyle: "plain" | "circle" | "rounded" | "square";
  cardStyle: "card" | "flat" | "bordered" | "filled";
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
  shadow: "none" | "sm" | "md" | "lg";
  padding: "none" | "sm" | "md" | "lg" | "xl";
  spacing: "sm" | "md" | "lg";
  alignment: "left" | "center" | "right";
  animation: "none" | "fadeIn" | "slideUp";
};

const DEFAULTS: ResolvedContactCardAppearance = {
  iconPosition: "left",
  iconStyle: "plain",
  cardStyle: "card",
  borderRadius: "lg",
  shadow: "sm",
  padding: "md",
  spacing: "md",
  alignment: "left",
  animation: "none",
};

/** Merge per-block overrides with theme, then defaults. */
export function resolveContactAppearance(
  props: Partial<ContactCardBase>,
  theme?: ContactTheme | null,
): ResolvedContactCardAppearance {
  const themeRadius = theme?.cardRadius as ResolvedContactCardAppearance["borderRadius"] | undefined;
  const themeShadow = theme?.cardShadow as ResolvedContactCardAppearance["shadow"] | undefined;
  const themeIconStyle = theme?.iconStyle as ResolvedContactCardAppearance["iconStyle"] | undefined;
  const themeSpacing = theme?.spacing as ResolvedContactCardAppearance["spacing"] | undefined;

  return {
    iconPosition: props.iconPosition ?? DEFAULTS.iconPosition,
    iconStyle: props.iconStyle ?? themeIconStyle ?? DEFAULTS.iconStyle,
    cardStyle: props.cardStyle ?? DEFAULTS.cardStyle,
    borderRadius: props.borderRadius ?? themeRadius ?? DEFAULTS.borderRadius,
    shadow: props.shadow ?? themeShadow ?? DEFAULTS.shadow,
    padding: props.padding ?? DEFAULTS.padding,
    spacing: props.spacing ?? themeSpacing ?? DEFAULTS.spacing,
    alignment: props.alignment ?? DEFAULTS.alignment,
    animation: props.animation ?? DEFAULTS.animation,
  };
}

export function newContactId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
