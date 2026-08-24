import type {
  MegaMenuContentConfig,
  MegaMenuIconLayoutConfig,
  MegaMenuNavigationConfig,
  MegaMenuPanelConfig,
  MegaMenuPanelGap,
  MegaMenuPanelLayout,
  MegaMenuSurfaceAlignment,
  MegaMenuSurfaceWidth,
  MegaMenuTabConfig,
  MenuItem,
} from "./types";
import { generateId } from "./menu-engine";
import { sanitizePanelChildIds } from "./mega-menu-validate";

/** Mega grid / columns layouts: 1–12 columns (same range as Icon Layout fixed columns). */
export function clampMegaColumns(n: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 3;
  return Math.min(12, Math.max(1, v));
}

/** Icon Layout supports 1–12 fixed columns. */
export function clampIconLayoutColumns(n: number): Exclude<MegaMenuIconLayoutConfig["columns"], "auto" | undefined> {
  return clampMegaColumns(n) as Exclude<MegaMenuIconLayoutConfig["columns"], "auto" | undefined>;
}

export function normalizeIconLayoutColumns(
  value: MegaMenuIconLayoutConfig["columns"] | string | number | null | undefined,
): NonNullable<MegaMenuIconLayoutConfig["columns"]> {
  if (value === "auto" || value == null || value === "") return "auto";
  return clampIconLayoutColumns(typeof value === "string" ? Number(value) : value);
}

export const DEFAULT_ICON_LAYOUT: Required<MegaMenuIconLayoutConfig> = {
  iconSize: "md",
  columns: "auto",
  alignment: "start",
  iconPosition: "top",
  showDescriptions: true,
  showBadges: true,
  spacing: "comfortable",
};

export function createEmptyMegaPanel(partial?: Partial<MegaMenuPanelConfig>): MegaMenuPanelConfig {
  return {
    id: partial?.id ?? generateId(),
    label: partial?.label ?? "Panel",
    layout: partial?.layout ?? "cards",
    columns: partial?.columns,
    gap: partial?.gap,
    childIds: partial?.childIds ? [...partial.childIds] : [],
    featured: partial?.featured ? { ...partial.featured } : undefined,
    carousel: partial?.carousel ? { ...partial.carousel } : undefined,
    columnGroups: partial?.columnGroups?.map((g) => ({
      ...g,
      childIds: [...g.childIds],
    })),
    source: partial?.source ? { ...partial.source } : undefined,
  };
}

export interface MegaMenuFormState {
  gridColumns: number;
  columnCount: number;
  width: NonNullable<MegaMenuContentConfig["width"]>;
  customWidth: number;
  height: NonNullable<MegaMenuContentConfig["height"]>;
  customHeight: number;
  mixedLeftTitle: string;
  mixedLeftBody: string;
  mixedLeftIcon: string;
  mixedRightTitle: string;
  mixedRightBody: string;
  mixedRightIcon: string;
  dropdownShowIcons: boolean;
  tabs: MegaMenuTabConfig[];
  childDescriptions: Record<string, string>;
  childCtaLabels: Record<string, string>;
  iconLayout: Required<MegaMenuIconLayoutConfig>;
  /** v2 */
  version: 1 | 2;
  navigationEnabled: boolean;
  navigationWidth: number;
  navigationItems: MegaMenuNavigationConfig["items"];
  panels: MegaMenuPanelConfig[];
  surfaceWidth: MegaMenuSurfaceWidth;
  alignment: MegaMenuSurfaceAlignment;
  selectedPanelId: string | null;
}

export function initMegaFormState(item: MenuItem | null): MegaMenuFormState {
  const m = item?.megaMenu;
  const tabs = m?.tabs?.length
    ? m.tabs.map((t) => ({ ...t, childIds: [...t.childIds] }))
    : [{ id: generateId(), label: "Featured", childIds: [] as string[] }];
  const il = m?.iconLayout;
  const parentChildIds = new Set((item?.children ?? []).map((c) => c.id));
  const panels =
    m?.panels?.length
      ? m.panels.map((p) => sanitizePanelChildIds(createEmptyMegaPanel(p), parentChildIds))
      : [];
  const navItems = m?.navigation?.items?.length
    ? m.navigation.items.map((n) => ({ ...n }))
    : [];

  return {
    gridColumns: clampMegaColumns(m?.gridColumns ?? 3),
    columnCount: clampMegaColumns(m?.columnCount ?? 3),
    width: (m?.width ?? "auto") as NonNullable<MegaMenuContentConfig["width"]>,
    customWidth: typeof m?.customWidth === "number" ? m.customWidth : 1100,
    height: (m?.height ?? "auto") as NonNullable<MegaMenuContentConfig["height"]>,
    customHeight: typeof m?.customHeight === "number" ? m.customHeight : 500,
    mixedLeftTitle: m?.mixed?.left?.title ?? "",
    mixedLeftBody: m?.mixed?.left?.body ?? "",
    mixedLeftIcon: m?.mixed?.left?.icon ?? "",
    mixedRightTitle: m?.mixed?.right?.title ?? "",
    mixedRightBody: m?.mixed?.right?.body ?? "",
    mixedRightIcon: m?.mixed?.right?.icon ?? "",
    dropdownShowIcons: m?.dropdownShowIcons !== false,
    tabs,
    childDescriptions: m?.childDescriptions ? { ...m.childDescriptions } : {},
    childCtaLabels: m?.childCtaLabels ? { ...m.childCtaLabels } : {},
    iconLayout: {
      iconSize: il?.iconSize ?? DEFAULT_ICON_LAYOUT.iconSize,
      columns: normalizeIconLayoutColumns(il?.columns),
      alignment: il?.alignment ?? DEFAULT_ICON_LAYOUT.alignment,
      iconPosition: il?.iconPosition ?? DEFAULT_ICON_LAYOUT.iconPosition,
      showDescriptions: il?.showDescriptions ?? DEFAULT_ICON_LAYOUT.showDescriptions,
      showBadges: il?.showBadges ?? DEFAULT_ICON_LAYOUT.showBadges,
      spacing: il?.spacing ?? DEFAULT_ICON_LAYOUT.spacing,
    },
    version: m?.version === 2 ? 2 : 1,
    navigationEnabled: m?.navigation?.enabled === true,
    navigationWidth: typeof m?.navigation?.width === "number" ? m.navigation.width : 220,
    navigationItems: navItems,
    panels,
    surfaceWidth: m?.surfaceWidth ?? "container",
    alignment: m?.alignment ?? "center",
    selectedPanelId: panels[0]?.id ?? null,
  };
}

export function megaFormToPersistedConfig(form: MegaMenuFormState): MegaMenuContentConfig | undefined {
  const out: MegaMenuContentConfig = {};
  const gc = clampMegaColumns(form.gridColumns);
  const cc = clampMegaColumns(form.columnCount);
  if (gc !== 3) out.gridColumns = gc;
  if (cc !== 3) out.columnCount = cc;

  const MAX_CUSTOM_WIDTH_PX = 2000;
  const MAX_CUSTOM_HEIGHT_PX = 1200;
  const clampCustom = (n: number, max: number) => {
    const v = Math.floor(Number(n));
    if (!Number.isFinite(v) || v <= 0) return 1;
    return Math.min(v, max);
  };

  if (form.width && form.width !== "auto") {
    out.width = form.width;
  }
  if (form.width === "custom") {
    out.customWidth = clampCustom(form.customWidth, MAX_CUSTOM_WIDTH_PX);
  }

  if (form.height && form.height !== "auto") {
    out.height = form.height;
  }
  if (form.height === "custom") {
    out.customHeight = clampCustom(form.customHeight, MAX_CUSTOM_HEIGHT_PX);
  }

  const lTitle = form.mixedLeftTitle.trim();
  const lBody = form.mixedLeftBody.trim();
  const lIcon = form.mixedLeftIcon.trim();
  const rTitle = form.mixedRightTitle.trim();
  const rBody = form.mixedRightBody.trim();
  const rIcon = form.mixedRightIcon.trim();
  if (lTitle || lBody || lIcon || rTitle || rBody || rIcon) {
    out.mixed = {};
    if (lTitle || lBody || lIcon) out.mixed.left = { title: lTitle, body: lBody, icon: lIcon };
    if (rTitle || rBody || rIcon) out.mixed.right = { title: rTitle, body: rBody, icon: rIcon };
  }

  const tabs = form.tabs.filter((t) => t.label.trim() || t.childIds.length);
  if (tabs.length) {
    out.tabs = tabs.map((t) => ({
      ...t,
      label: t.label.trim() || "Tab",
      childIds: [...t.childIds],
    }));
  }

  if (form.dropdownShowIcons === false) out.dropdownShowIcons = false;

  const desc: Record<string, string> = {};
  for (const [id, text] of Object.entries(form.childDescriptions)) {
    if (text?.trim()) desc[id] = text.trim();
  }
  if (Object.keys(desc).length) out.childDescriptions = desc;

  const ctaLabels: Record<string, string> = {};
  for (const [id, text] of Object.entries(form.childCtaLabels)) {
    if (text?.trim()) ctaLabels[id] = text.trim();
  }
  if (Object.keys(ctaLabels).length) out.childCtaLabels = ctaLabels;

  const il = form.iconLayout;
  const iconLayoutOut: MegaMenuIconLayoutConfig = {};
  if (il.iconSize !== DEFAULT_ICON_LAYOUT.iconSize) iconLayoutOut.iconSize = il.iconSize;
  if (il.columns !== DEFAULT_ICON_LAYOUT.columns) iconLayoutOut.columns = il.columns;
  if (il.alignment !== DEFAULT_ICON_LAYOUT.alignment) iconLayoutOut.alignment = il.alignment;
  if (il.iconPosition !== DEFAULT_ICON_LAYOUT.iconPosition) iconLayoutOut.iconPosition = il.iconPosition;
  if (il.showDescriptions !== DEFAULT_ICON_LAYOUT.showDescriptions) {
    iconLayoutOut.showDescriptions = il.showDescriptions;
  }
  if (il.showBadges !== DEFAULT_ICON_LAYOUT.showBadges) iconLayoutOut.showBadges = il.showBadges;
  if (il.spacing !== DEFAULT_ICON_LAYOUT.spacing) iconLayoutOut.spacing = il.spacing;
  if (Object.keys(iconLayoutOut).length) out.iconLayout = iconLayoutOut;

  if (form.version === 2) {
    out.version = 2;
    if (form.surfaceWidth && form.surfaceWidth !== "auto") {
      out.surfaceWidth = form.surfaceWidth;
    }
    if (form.alignment && form.alignment !== "center") {
      out.alignment = form.alignment;
    }

    const panels = form.panels
      .filter((p) => p.id)
      .map((p) => {
        const panel: MegaMenuPanelConfig = {
          id: p.id,
          layout: p.layout,
          childIds: [...(p.childIds ?? [])],
        };
        if (p.label?.trim()) panel.label = p.label.trim();
        if (p.columns) panel.columns = clampMegaColumns(p.columns);
        if (p.gap && p.gap !== ("md" as MegaMenuPanelGap)) panel.gap = p.gap;
        if (p.featured?.childId || p.featured?.ctaLabel) {
          panel.featured = {
            ...(p.featured.childId ? { childId: p.featured.childId } : {}),
            ...(p.featured.ctaLabel?.trim() ? { ctaLabel: p.featured.ctaLabel.trim() } : {}),
          };
        }
        if (p.carousel?.enabled) {
          panel.carousel = {
            enabled: true,
            ...(p.carousel.arrows === false ? { arrows: false } : {}),
            ...(p.carousel.autoplay ? { autoplay: true } : {}),
          };
        }
        if (p.columnGroups?.length) {
          panel.columnGroups = p.columnGroups.map((g) => ({
            id: g.id,
            heading: g.heading.trim() || "Column",
            childIds: [...g.childIds],
            ...(g.ctaLabel?.trim() ? { ctaLabel: g.ctaLabel.trim() } : {}),
            ...(g.ctaChildId ? { ctaChildId: g.ctaChildId } : {}),
          }));
        }
        if (p.source?.type === "collectionChildren" && p.source.collectionId) {
          panel.source = { type: "collectionChildren", collectionId: p.source.collectionId };
        }
        return panel;
      });
    if (panels.length) out.panels = panels;

    if (form.navigationEnabled || form.navigationItems.length) {
      out.navigation = {
        enabled: form.navigationEnabled,
        ...(form.navigationWidth !== 220 ? { width: form.navigationWidth } : {}),
        items: form.navigationItems.map((n) => ({
          id: n.id,
          label: n.label.trim() || "Section",
          panelId: n.panelId,
          ...(n.icon?.trim() ? { icon: n.icon.trim() } : {}),
        })),
      };
    }
  }

  if (Object.keys(out).length === 0) return undefined;
  return out;
}

export function resolveIconLayoutConfig(
  config?: MegaMenuIconLayoutConfig | null,
): Required<MegaMenuIconLayoutConfig> {
  return {
    iconSize: config?.iconSize ?? DEFAULT_ICON_LAYOUT.iconSize,
    columns: normalizeIconLayoutColumns(config?.columns),
    alignment: config?.alignment ?? DEFAULT_ICON_LAYOUT.alignment,
    iconPosition: config?.iconPosition ?? DEFAULT_ICON_LAYOUT.iconPosition,
    showDescriptions: config?.showDescriptions ?? DEFAULT_ICON_LAYOUT.showDescriptions,
    showBadges: config?.showBadges ?? DEFAULT_ICON_LAYOUT.showBadges,
    spacing: config?.spacing ?? DEFAULT_ICON_LAYOUT.spacing,
  };
}

export function assignChildToTabExclusive(
  tabs: MegaMenuTabConfig[],
  tabIdx: number,
  childId: string,
  checked: boolean
): MegaMenuTabConfig[] {
  if (!checked) {
    return tabs.map((t, i) =>
      i === tabIdx ? { ...t, childIds: t.childIds.filter((id) => id !== childId) } : t
    );
  }
  return tabs.map((t, i) => ({
    ...t,
    childIds:
      i === tabIdx
        ? [...t.childIds.filter((id) => id !== childId), childId]
        : t.childIds.filter((id) => id !== childId),
  }));
}

/** Assign a child to one panel exclusively (same semantics as tabs). */
export function assignChildToPanelExclusive(
  panels: MegaMenuPanelConfig[],
  panelId: string,
  childId: string,
  checked: boolean,
): MegaMenuPanelConfig[] {
  if (!checked) {
    return panels.map((p) =>
      p.id === panelId ? { ...p, childIds: p.childIds.filter((id) => id !== childId) } : p,
    );
  }
  return panels.map((p) => ({
    ...p,
    childIds:
      p.id === panelId
        ? [...p.childIds.filter((id) => id !== childId), childId]
        : p.childIds.filter((id) => id !== childId),
  }));
}

/** Create a nav row + panel with matching panelId binding. */
export function createPairedNavPanel(
  label: string,
  layout: MegaMenuPanelLayout,
  partial?: Partial<MegaMenuPanelConfig>,
): {
  navItem: MegaMenuNavigationConfig["items"][number];
  panel: MegaMenuPanelConfig;
} {
  const panel = createEmptyMegaPanel({ label, layout, ...partial });
  const navItem = { id: generateId(), label, panelId: panel.id };
  return { navItem, panel };
}

/** Add a paired nav section + panel to v2 form state. */
export function addNavPanelPair(
  form: MegaMenuFormState,
  label?: string,
  layout: MegaMenuPanelLayout = "cards",
): MegaMenuFormState {
  const { navItem, panel } = createPairedNavPanel(
    label ?? `Section ${form.navigationItems.length + 1}`,
    layout,
  );
  return {
    ...form,
    version: 2,
    navigationEnabled: true,
    panels: [...form.panels, panel],
    navigationItems: [...form.navigationItems, navItem],
    selectedPanelId: panel.id,
  };
}

/** Remove nav row and its bound panel together. */
export function removeNavPanelPair(form: MegaMenuFormState, panelId: string): MegaMenuFormState {
  const panels = form.panels.filter((p) => p.id !== panelId);
  const navigationItems = form.navigationItems.filter((n) => n.panelId !== panelId);
  const selectedPanelId =
    form.selectedPanelId === panelId ? (panels[0]?.id ?? null) : form.selectedPanelId;
  return { ...form, panels, navigationItems, selectedPanelId };
}

export type SidebarScaffoldFields = Pick<
  MegaMenuFormState,
  | "version"
  | "navigationEnabled"
  | "navigationWidth"
  | "navigationItems"
  | "panels"
  | "selectedPanelId"
  | "surfaceWidth"
  | "alignment"
>;

/** Default sidebar scaffold: 4 UniFi-style sections or 1 minimal section. */
export function buildSidebarScaffold(fullTemplate = true): SidebarScaffoldFields {
  if (!fullTemplate) {
    const { navItem, panel } = createPairedNavPanel("Section 1", "cards");
    return {
      version: 2,
      navigationEnabled: true,
      navigationWidth: 220,
      navigationItems: [navItem],
      panels: [panel],
      selectedPanelId: panel.id,
      surfaceWidth: "container",
      alignment: "center",
    };
  }

  const how = createPairedNavPanel("How It Works?", "iconGrid", { columns: 4 });
  const resources = createPairedNavPanel("Resources", "featured", {
    columns: 5,
    carousel: { enabled: true, arrows: true },
  });
  const caseStudies = createPairedNavPanel("Case Studies", "featured", { columns: 5 });
  const siteMap = createPairedNavPanel("Site Map", "mixed");
  const pairs = [how, resources, caseStudies, siteMap];

  return {
    version: 2,
    navigationEnabled: true,
    navigationWidth: 220,
    navigationItems: pairs.map((p) => p.navItem),
    panels: pairs.map((p) => p.panel),
    selectedPanelId: how.panel.id,
    surfaceWidth: "container",
    alignment: "center",
  };
}

export function buildPanelOnlyScaffold(layout: MegaMenuPanelLayout = "productGrid"): SidebarScaffoldFields {
  const panel = createEmptyMegaPanel({
    label: "Panel 1",
    layout,
    columns: layout === "productGrid" ? 6 : 4,
  });
  return {
    version: 2,
    navigationEnabled: false,
    navigationWidth: 220,
    navigationItems: [],
    panels: [panel],
    selectedPanelId: panel.id,
    surfaceWidth: "container",
    alignment: "center",
  };
}

function scaffoldToMegaMenuConfig(scaffold: SidebarScaffoldFields): MegaMenuContentConfig {
  const form: MegaMenuFormState = {
    ...initMegaFormState(null),
    ...scaffold,
  };
  return megaFormToPersistedConfig(form) ?? { version: 2 };
}

export function buildSidebarScaffoldMegaMenu(): MegaMenuContentConfig {
  return scaffoldToMegaMenuConfig(buildSidebarScaffold(true));
}

export function buildPanelOnlyScaffoldMegaMenu(): MegaMenuContentConfig {
  return scaffoldToMegaMenuConfig(buildPanelOnlyScaffold("productGrid"));
}

/** Ensure v2 form has panels + nav rows when switching to sidebar/panel layout. */
export function ensureV2Panels(
  form: MegaMenuFormState,
  layoutType?: "sidebar" | "panel",
): MegaMenuFormState {
  if (form.panels.length > 0) {
    const panelIds = new Set(form.panels.map((p) => p.id));
    const navigationItems = form.navigationItems.filter((n) => panelIds.has(n.panelId));
    return {
      ...form,
      version: 2,
      navigationItems,
      selectedPanelId: form.selectedPanelId ?? form.panels[0].id,
    };
  }
  if (layoutType === "sidebar") {
    return { ...form, ...buildSidebarScaffold(true) };
  }
  return { ...form, ...buildPanelOnlyScaffold("productGrid") };
}
