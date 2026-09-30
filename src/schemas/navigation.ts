import { z } from "zod";

const megaMenuPanelLayoutSchema = z.enum([
  "links",
  "cards",
  "featured",
  "columns",
  "iconGrid",
  "productGrid",
  "mixed",
]);

const megaMenuColumnGroupSchema = z.object({
  id: z.string(),
  heading: z.string(),
  childIds: z.array(z.string()),
  ctaLabel: z.string().optional(),
  ctaChildId: z.string().optional(),
});

const megaMenuPanelSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  layout: megaMenuPanelLayoutSchema,
  columns: z.number().int().min(1).max(12).optional(),
  gap: z.enum(["sm", "md", "lg"]).optional(),
  childIds: z.array(z.string()),
  featured: z
    .object({
      childId: z.string().optional(),
      ctaLabel: z.string().optional(),
    })
    .optional(),
  carousel: z
    .object({
      enabled: z.boolean(),
      arrows: z.boolean().optional(),
      autoplay: z.boolean().optional(),
    })
    .optional(),
  columnGroups: z.array(megaMenuColumnGroupSchema).optional(),
  source: z
    .object({
      type: z.literal("collectionChildren"),
      collectionId: z.string(),
    })
    .optional(),
});

const megaMenuNavigationSchema = z.object({
  enabled: z.boolean(),
  width: z.number().int().min(120).max(480).optional(),
  items: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      panelId: z.string(),
      icon: z.string().optional(),
    }),
  ),
});

const menuLayoutTypeSchema = z.enum([
  "grid",
  "mixed",
  "columns",
  "tabbed",
  "dropdown",
  "icon",
  "sidebar",
  "panel",
]);

const megaMenuContentSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]).optional(),
    gridColumns: z.number().int().min(1).max(12).optional(),
    columnCount: z.number().int().min(1).max(12).optional(),
    mixed: z
      .object({
        left: z
          .object({
            title: z.string().optional(),
            body: z.string().optional(),
            icon: z.string().optional(),
          })
          .optional(),
        right: z
          .object({
            title: z.string().optional(),
            body: z.string().optional(),
            icon: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    tabs: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          childIds: z.array(z.string()),
        }),
      )
      .optional(),
    dropdownShowIcons: z.boolean().optional(),
    childDescriptions: z.record(z.string()).optional(),
    childCtaLabels: z.record(z.string()).optional(),
    iconLayout: z
      .object({
        iconSize: z.enum(["sm", "md", "lg"]).optional(),
        columns: z
          .union([
            z.literal("auto"),
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
            z.literal(6),
            z.literal(7),
            z.literal(8),
            z.literal(9),
            z.literal(10),
            z.literal(11),
            z.literal(12),
          ])
          .optional(),
        alignment: z.enum(["start", "center", "end"]).optional(),
        iconPosition: z.enum(["top", "left"]).optional(),
        showDescriptions: z.boolean().optional(),
        showBadges: z.boolean().optional(),
        spacing: z.enum(["compact", "comfortable", "spacious"]).optional(),
      })
      .optional(),
    width: z.enum(["auto", "sm", "md", "lg", "xl", "full", "custom"]).optional(),
    customWidth: z.number().int().min(1).max(2000).optional(),
    height: z.enum(["auto", "sm", "md", "lg", "xl", "custom"]).optional(),
    customHeight: z.number().int().min(1).max(1200).optional(),
    navigation: megaMenuNavigationSchema.optional(),
    panels: z.array(megaMenuPanelSchema).optional(),
    surfaceWidth: z.enum(["auto", "container", "wide", "full"]).optional(),
    alignment: z.enum(["left", "center", "right"]).optional(),
  })
  .passthrough();

const menuItemSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
      "link",
      "page",
      "collection",
      "brand",
      "tag",
      "product",
      "package",
      "packageCategory",
      "post",
      "image",
    ]),
    label: z.string(),
    icon: z.string().optional(),
    placement: z.enum(["desktop", "mobile", "both"]),
    children: z.array(menuItemSchema),
    megaMenuType: menuLayoutTypeSchema.optional(),
    megaMenu: megaMenuContentSchema.optional(),
    megaMenuChildDisplayType: z
      .enum(["automatic", "link", "card", "featured", "icon", "product"])
      .optional(),
    url: z.string().optional(),
    pageId: z.string().optional(),
    collectionId: z.string().optional(),
    brandSlug: z.string().optional(),
    tagSlug: z.string().optional(),
    productId: z.string().optional(),
    packageId: z.string().optional(),
    packageCategoryId: z.string().optional(),
    postId: z.string().optional(),
    imageUrl: z.string().optional(),
    linkUrl: z.string().optional(),
    visibility: z.enum(["visible", "hidden", "draft", "scheduled"]).optional(),
    scheduledAt: z.string().optional(),
    audience: z.enum(["all", "authenticated", "guest"]).optional(),
    roles: z.array(z.string()).optional(),
    badgeText: z.string().optional(),
    highlight: z.boolean().optional(),
    customClass: z.string().optional(),
    openInNewTab: z.boolean().optional(),
    noFollow: z.boolean().optional(),
    customTarget: z.string().optional(),
    localizedUrls: z.record(z.string()).optional(),
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
    tabletNavShowIcons: z.boolean().optional(),
    desktopNavShowIcons: z.boolean().optional(),
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
    mobileBoxedSticky: z.boolean().optional(),
    mobileFlushTop: z.boolean().optional(),
  }),
});

export type HeaderWorkspaceInput = z.infer<typeof headerWorkspaceSchema>;
