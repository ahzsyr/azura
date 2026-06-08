import { z } from "zod";

const menuItemSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
      "link",
      "page",
      "collection",
      "product",
      "package",
      "packageCategory",
      "post",
      "image",
    ]),
    label: z.string(),
    labels: z.record(z.string()).optional(),
    icon: z.string().optional(),
    placement: z.enum(["desktop", "mobile", "both"]),
    children: z.array(menuItemSchema),
    megaMenuType: z.enum(["grid", "mixed", "columns", "tabbed", "dropdown"]).optional(),
    megaMenu: z.record(z.unknown()).optional(),
    url: z.string().optional(),
    pageId: z.string().optional(),
    collectionId: z.string().optional(),
    productId: z.string().optional(),
    packageId: z.string().optional(),
    packageCategoryId: z.string().optional(),
    postId: z.string().optional(),
    imageUrl: z.string().optional(),
    linkUrl: z.string().optional(),
  })
);

export const headerWorkspaceSchema = z.object({
  version: z.literal(1).default(1),
  menusDatabase: z.record(
    z.object({
      name: z.string(),
      items: z.array(menuItemSchema),
      globalApply: z.enum(["none", "Both", "Mobile", "Desktop"]),
    })
  ),
  activeMenuKey: z.string(),
  branding: z.object({
    logoMode: z.enum(["text", "image"]),
    logoText: z.string(),
    logoImageUrl: z.string().optional(),
    logoImageLightUrl: z.string(),
    logoImageDarkUrl: z.string(),
    brandName: z.string(),
    tagline: z.string(),
    showTagline: z.boolean(),
    areaStyle: z.enum(["default", "soft", "outline"]),
    brandLayoutMobile: z.enum(["logo-only", "text-only", "logo-and-text"]),
    brandLayoutDesktop: z.enum(["logo-only", "text-only", "logo-and-text"]),
    logoSizing: z
      .object({
        mode: z.enum(["fixed", "adaptive"]),
        heightMobile: z.number(),
        heightTablet: z.number(),
        heightDesktop: z.number(),
        adaptiveMin: z.number(),
        adaptiveMax: z.number(),
      })
      .optional(),
    brandNameTypography: z
      .object({
        fontSource: z.enum(["heading", "body", "custom"]),
        customFont: z.string().optional(),
        sizeMobile: z.string(),
        sizeDesktop: z.string(),
        fontWeight: z.union([z.literal(600), z.literal(700), z.literal(800)]),
      })
      .optional(),
    brandTaglineTypography: z
      .object({
        fontSource: z.enum(["heading", "body", "custom"]),
        customFont: z.string().optional(),
        sizeMobile: z.string(),
        sizeDesktop: z.string(),
        fontWeight: z.union([z.literal(400), z.literal(500), z.literal(600)]),
      })
      .optional(),
  }),
  headerActions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["search", "language", "account", "custom"]),
      label: z.string(),
      icon: z.string(),
      style: z.enum(["icon", "solid", "outline", "ghost"]),
      outlined: z.boolean(),
      visible: z.boolean(),
      href: z.string().optional(),
    })
  ),
  settings: z.object({
    headerStyle: z.enum(["normal-compact", "normal-minimal", "boxed-compact", "boxed-minimal"]),
    headerBorderRadius: z.enum(["none", "sm", "md", "lg", "xl"]).optional(),
    menuType: z.enum(["grid", "mixed", "columns", "tabbed", "dropdown"]),
    mobileType: z.enum(["hamburger", "bottom", "fullscreen", "accordion", "tabs", "search"]),
    headerDesktopMode: z.enum([
      "static",
      "sticky",
      "fixed-top",
      "hide-reveal",
      "shrink-scroll",
      "absolute",
    ]),
    mobileNavStyle: z.enum(["minimal", "card", "divider", "bordered"]).optional(),
    mobileNavAnimation: z.enum(["slide", "fade", "scale", "spring"]).optional(),
    mobileNavDensity: z.enum(["compact", "comfortable", "spacious"]).optional(),
    mobileNavSubmenuBehavior: z.enum(["expand", "slide"]).optional(),
    mobileNavShowIcons: z.boolean().optional(),
    mobileNavShowArrows: z.boolean().optional(),
    overlayMode: z.enum(["none", "over-media", "transparent-until-scroll"]).optional(),
    overlaySurface: z.enum(["glass", "solid", "transparent"]).optional(),
    firstBlockHeaderOverlay: z
      .object({
        enabled: z.boolean().optional(),
        contentInset: z.enum(["auto", "custom"]).optional(),
        paddingTop: z.string().optional(),
      })
      .optional(),
    menuSurface: z.enum(["transparent", "glass", "solid"]).optional(),
    menuGlassEnabled: z.boolean().optional(),
    menuBlurStrength: z.enum(["light", "medium", "strong"]).optional(),
    menuTransparency: z.number().min(40).max(98).optional(),
    menuShadow: z.enum(["none", "soft", "strong"]).optional(),
    menuPanelAnimation: z.enum(["fade", "slide", "scale"]).optional(),
    mobileMenuSurface: z.enum(["transparent", "glass", "solid"]).optional(),
    mobileMenuGlassEnabled: z.boolean().optional(),
    mobileMenuBlurStrength: z.enum(["light", "medium", "strong"]).optional(),
    mobileMenuTransparency: z.number().min(40).max(98).optional(),
    mobileMenuShadow: z.enum(["none", "soft", "strong"]).optional(),
    mobileMenuAnimation: z.enum(["slide", "fade", "scale", "spring"]).optional(),
  }),
});

export type HeaderWorkspaceInput = z.infer<typeof headerWorkspaceSchema>;
