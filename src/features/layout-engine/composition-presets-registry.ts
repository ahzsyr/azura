import { BUILTIN_PAGE_TEMPLATE_BLOCKS } from "@/features/builder/builtin-page-template-blocks";
import type { PageBlocks } from "@/types/builder";
import type { RegionId } from "@/features/layout-engine/types";

export type CompositionPreset = {
  id: string;
  name: string;
  description?: string;
  targetRegion: RegionId;
  blocks: PageBlocks;
};

const BUILTIN_PRESETS: CompositionPreset[] = [
  {
    id: "top-hero",
    name: "Hero (Top Section)",
    description: "Full-width hero block for the optional top section.",
    targetRegion: "top",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.landing.slice(0, 1),
  },
  {
    id: "landing-starter",
    name: "Landing Starter",
    description: "Hero, features, featured catalog, testimonials, and CTA.",
    targetRegion: "primary",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.landing,
  },
  {
    id: "about-starter",
    name: "About Starter",
    description: "Hero, story, values, and rich text content.",
    targetRegion: "primary",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.about,
  },
  {
    id: "contact-starter",
    name: "Contact Starter",
    description: "Hero, inquiry form, and contact details.",
    targetRegion: "primary",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.contact,
  },
  {
    id: "sidebar-cta",
    name: "Sidebar CTA",
    description: "A compact CTA starter for sidebar regions.",
    targetRegion: "asideEnd",
    blocks: BUILTIN_PAGE_TEMPLATE_BLOCKS.compare.slice(0, 1),
  },
];

class CompositionPresetsRegistrySystem {
  private readonly entries = new Map<string, CompositionPreset>();

  constructor() {
    for (const preset of BUILTIN_PRESETS) {
      this.register(preset);
    }
  }

  register(preset: CompositionPreset): void {
    this.entries.set(preset.id, preset);
  }

  get(id: string): CompositionPreset | undefined {
    return this.entries.get(id);
  }

  list(): CompositionPreset[] {
    return [...this.entries.values()];
  }
}

export const compositionPresetsRegistry = new CompositionPresetsRegistrySystem();
