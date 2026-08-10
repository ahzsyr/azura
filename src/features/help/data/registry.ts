import { HELP_CONTENT_VERSION } from "@/features/help/data/version";
import { helpInventory } from "@/features/help/inventory";
import { helpDefinitions } from "@/features/help/definitions";
import { composeHubSections } from "@/features/help/lib/compose-page-article";
import { HELP_WORKFLOWS } from "@/features/help/workflows";
import { HELP_CHECKLISTS } from "@/features/help/checklists";
import { HELP_FAQS } from "@/features/help/data/faq";
import { HELP_TROUBLESHOOTING } from "@/features/help/data/troubleshooting";
import {
  applySearchIndexes,
  indexRegistryMaps,
} from "@/features/help/lib/build-search-index";
import { validateHelpRegistry } from "@/features/help/lib/validate-registry";
import { validateHelpPlatform } from "@/features/help/validators/platform";
import type { HelpRegistry } from "@/features/help/types";

function buildHelpRegistry(): HelpRegistry {
  const sections = composeHubSections(helpInventory, helpDefinitions);
  const workflows = HELP_WORKFLOWS;
  const checklists = HELP_CHECKLISTS;
  const faqs = HELP_FAQS;
  const troubleshooting = HELP_TROUBLESHOOTING;

  applySearchIndexes({ sections, workflows, checklists, faqs, troubleshooting });

  const maps = indexRegistryMaps(sections, workflows, checklists);

  const registry: HelpRegistry = {
    version: HELP_CONTENT_VERSION,
    sections,
    workflows,
    checklists,
    faqs,
    troubleshooting,
    ...maps,
  };

  validateHelpRegistry(registry);
  validateHelpPlatform({
    inventory: helpInventory,
    definitions: helpDefinitions,
    registry,
  });

  return registry;
}

/** Single consumption point for Help Center data. */
export const helpRegistry: HelpRegistry = buildHelpRegistry();
