import type {
  BreakpointBehavior,
  LayoutDefinition,
  LayoutType,
  LayoutSwitchEntry,
  RegionId,
} from "./types";

const TOP_REGION_POLICY = {};

function responsive(
  stackOrder: RegionId[],
  visible: RegionId[] = stackOrder,
): BreakpointBehavior {
  return {
    stackOrder,
    regionVisibility: {
      top: visible.includes("top"),
      primary: visible.includes("primary"),
      asideStart: visible.includes("asideStart"),
      asideEnd: visible.includes("asideEnd"),
    },
  };
}

function switchEntry(
  from: LayoutType,
  to: LayoutType,
  regionMap: LayoutSwitchEntry["regionMap"],
): LayoutSwitchEntry {
  return { from, to, regionMap };
}

const BUILTIN_LAYOUTS: LayoutDefinition[] = [
  {
    type: "full",
    name: "Full Width",
    editorDescription: "Best for landing pages, flexible marketing pages, and immersive content.",
    activeRegions: ["primary"],
    primaryRegion: "primary",
    defaultResponsive: {
      tablet: responsive(["primary"]),
      mobile: responsive(["primary"]),
    },
    supportsTopSection: true,
    supportsStickyAside: false,
    supportsCustomRatio: false,
    supportsResponsiveVisibility: false,
    regionPolicies: {
      top: TOP_REGION_POLICY,
      primary: {},
    },
    switchMap: [
      switchEntry("full", "left-sidebar", { primary: "primary", asideStart: "restore" }),
      switchEntry("full", "right-sidebar", { primary: "primary", asideEnd: "restore" }),
      switchEntry("full", "three-column", {
        primary: "primary",
        asideStart: "restore",
        asideEnd: "restore",
      }),
      switchEntry("full", "split", { primary: null, asideStart: "restore", asideEnd: "restore" }),
    ],
  },
  {
    type: "left-sidebar",
    name: "Left Sidebar",
    editorDescription: "Best for documentation, blogs, knowledge bases, and pages with a CTA sidebar.",
    activeRegions: ["asideStart", "primary"],
    primaryRegion: "primary",
    defaultRatio: "25-75",
    defaultResponsive: {
      tablet: responsive(["primary", "asideStart"]),
      mobile: responsive(["primary", "asideStart"], ["primary"]),
    },
    supportsTopSection: true,
    supportsStickyAside: true,
    supportsCustomRatio: true,
    supportsResponsiveVisibility: true,
    regionPolicies: {
      top: TOP_REGION_POLICY,
      primary: {},
      asideStart: {
        disallowedBlockTypes: ["hero", "videoHero", "videoGallery", "timeline"],
      },
    },
    switchMap: [
      switchEntry("left-sidebar", "full", { primary: "primary", asideStart: null }),
      switchEntry("left-sidebar", "right-sidebar", {
        primary: "primary",
        asideStart: "asideEnd",
        asideEnd: "restore",
      }),
      switchEntry("left-sidebar", "three-column", {
        primary: "primary",
        asideStart: "asideStart",
        asideEnd: "restore",
      }),
      switchEntry("left-sidebar", "split", {
        asideStart: "asideStart",
        primary: "asideEnd",
        asideEnd: "restore",
      }),
    ],
  },
  {
    type: "right-sidebar",
    name: "Right Sidebar",
    editorDescription: "Best for marketing pages, product content, and editorial layouts with secondary content.",
    activeRegions: ["primary", "asideEnd"],
    primaryRegion: "primary",
    defaultRatio: "75-25",
    defaultResponsive: {
      tablet: responsive(["primary", "asideEnd"]),
      mobile: responsive(["primary", "asideEnd"], ["primary"]),
    },
    supportsTopSection: true,
    supportsStickyAside: true,
    supportsCustomRatio: true,
    supportsResponsiveVisibility: true,
    regionPolicies: {
      top: TOP_REGION_POLICY,
      primary: {},
      asideEnd: {
        disallowedBlockTypes: ["hero", "videoHero", "videoGallery", "timeline"],
      },
    },
    switchMap: [
      switchEntry("right-sidebar", "full", { primary: "primary", asideEnd: null }),
      switchEntry("right-sidebar", "left-sidebar", {
        primary: "primary",
        asideEnd: "asideStart",
        asideStart: "restore",
      }),
      switchEntry("right-sidebar", "three-column", {
        primary: "primary",
        asideEnd: "asideEnd",
        asideStart: "restore",
      }),
      switchEntry("right-sidebar", "split", {
        primary: "asideStart",
        asideEnd: "asideEnd",
        asideStart: "restore",
      }),
    ],
  },
  {
    type: "three-column",
    name: "Three Columns",
    editorDescription: "Best for magazine pages, comparison surfaces, and advanced multi-column experiences.",
    activeRegions: ["asideStart", "primary", "asideEnd"],
    primaryRegion: "primary",
    defaultRatio: "20-60-20",
    defaultResponsive: {
      tablet: responsive(["primary", "asideStart", "asideEnd"], ["primary", "asideStart"]),
      mobile: responsive(["primary", "asideStart", "asideEnd"], ["primary"]),
    },
    supportsTopSection: true,
    supportsStickyAside: true,
    supportsCustomRatio: true,
    supportsResponsiveVisibility: true,
    regionPolicies: {
      top: TOP_REGION_POLICY,
      primary: {},
      asideStart: {
        disallowedBlockTypes: ["hero", "videoHero", "videoGallery", "timeline"],
      },
      asideEnd: {
        disallowedBlockTypes: ["hero", "videoHero", "videoGallery", "timeline"],
      },
    },
    switchMap: [
      switchEntry("three-column", "full", {
        primary: "primary",
        asideStart: null,
        asideEnd: null,
      }),
      switchEntry("three-column", "left-sidebar", {
        primary: "primary",
        asideStart: "asideStart",
        asideEnd: null,
      }),
      switchEntry("three-column", "right-sidebar", {
        primary: "primary",
        asideStart: null,
        asideEnd: "asideEnd",
      }),
      switchEntry("three-column", "split", {
        primary: null,
        asideStart: "asideStart",
        asideEnd: "asideEnd",
      }),
    ],
  },
  {
    type: "split",
    name: "Split",
    editorDescription: "Best for side-by-side storytelling, FAQ and contact layouts, and comparison-driven pages.",
    activeRegions: ["asideStart", "asideEnd"],
    primaryRegion: "asideStart",
    defaultRatio: "equal",
    defaultResponsive: {
      tablet: responsive(["asideStart", "asideEnd"]),
      mobile: responsive(["asideStart", "asideEnd"]),
    },
    supportsTopSection: true,
    supportsStickyAside: false,
    supportsCustomRatio: true,
    supportsResponsiveVisibility: true,
    regionPolicies: {
      top: TOP_REGION_POLICY,
      asideStart: {},
      asideEnd: {},
    },
    switchMap: [
      switchEntry("split", "full", {
        asideStart: null,
        asideEnd: null,
        primary: "restore",
      }),
      switchEntry("split", "left-sidebar", {
        asideStart: "asideStart",
        asideEnd: "primary",
        primary: "restore",
      }),
      switchEntry("split", "right-sidebar", {
        asideStart: "primary",
        asideEnd: "asideEnd",
        primary: "restore",
      }),
      switchEntry("split", "three-column", {
        asideStart: "asideStart",
        asideEnd: "asideEnd",
        primary: "restore",
      }),
    ],
  },
];

class LayoutRegistrySystem {
  private readonly entries = new Map<LayoutType, LayoutDefinition>();

  constructor() {
    for (const definition of BUILTIN_LAYOUTS) {
      this.register(definition);
    }
  }

  register(definition: LayoutDefinition): void {
    this.entries.set(definition.type, definition);
  }

  get(type: LayoutType): LayoutDefinition | undefined {
    return this.entries.get(type);
  }

  getOrThrow(type: LayoutType): LayoutDefinition {
    const definition = this.get(type);
    if (!definition) throw new Error(`Unknown layout type: ${type}`);
    return definition;
  }

  list(): LayoutDefinition[] {
    return [...this.entries.values()];
  }
}

export const layoutRegistry = new LayoutRegistrySystem();

/** Prepend top region to responsive stack order when the top section is enabled. */
export function withTopInStackOrder(order: RegionId[], topEnabled: boolean): RegionId[] {
  if (!topEnabled || order.includes("top")) return order;
  return ["top", ...order];
}
