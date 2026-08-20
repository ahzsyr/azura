import { registerProvider } from "@/modules/marketing/core/registry";
import { registerProviderManifest } from "@/modules/marketing/core/manifests";
import { metaProviderAdapter } from "@/modules/marketing/providers/meta/adapter";
import { metaProviderManifest } from "@/modules/marketing/providers/meta/manifest";
import { linkedinProviderAdapter } from "@/modules/marketing/providers/linkedin/adapter";
import { linkedinProviderManifest } from "@/modules/marketing/providers/linkedin/manifest";
import { wireMarketingAutomation } from "@/modules/marketing/automation/wire";

let bootstrapped = false;

export function bootstrapMarketingModule() {
  if (bootstrapped) return;
  bootstrapped = true;

  registerProviderManifest(metaProviderManifest);
  registerProviderManifest(linkedinProviderManifest);
  registerProvider(metaProviderAdapter);
  registerProvider(linkedinProviderAdapter);
  wireMarketingAutomation();
}

export function resetMarketingBootstrapForTests() {
  bootstrapped = false;
}
