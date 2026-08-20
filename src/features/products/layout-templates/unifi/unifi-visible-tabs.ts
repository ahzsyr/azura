export {
  visibleUniFiTabs,
  listVisibleUniFiTabs,
  uniFiOverviewEnabled,
  uniFiTechnicalEnabled,
  uniFiInstallationEnabled,
  uniFiInTheBoxEnabled,
} from "./unifi-display";

export {
  hasTechnicalContent as productHasSpecRows,
  hasInstallationContent as productHasInstallResources,
  hasInTheBoxContent as productHasBoxMedia,
} from "@/features/products/lib/unifi-product-sections";
