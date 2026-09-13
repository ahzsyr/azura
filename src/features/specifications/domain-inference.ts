const RADIO_BRANDS = new Set([
  "inrico",
  "belfone",
  "motorola",
  "hytera",
  "kenwood",
  "icom",
]);

const RADIO_CATEGORY_HINTS = [
  "two-way radio",
  "two way radio",
  "walkie talkie",
  "dmr",
  "poc radio",
  "handheld radio",
];

const NETWORKING_CATEGORY_HINTS = [
  "access point",
  "router",
  "switch",
  "ethernet",
  "wifi",
  "wi-fi",
  "network",
  "gateway",
];

const CAMERA_CATEGORY_HINTS = ["camera", "nvr", "surveillance", "bullet", "dome", "ptz"];

function haystack(product: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of ["mainCategory", "category", "cat_leaf", "title", "brand", "output_format"]) {
    const val = product[key];
    if (val) parts.push(String(val));
  }
  for (const path of (product.cat_path_titles as string[] | undefined) || (product.category_paths as string[] | undefined) || []) {
    parts.push(String(path));
  }
  for (const path of (product.brand_path_titles as string[] | undefined) || (product.brand_paths as string[] | undefined) || []) {
    parts.push(String(path));
  }
  return parts.join(" ").toLowerCase();
}

export function inferProductDomain(product: Record<string, unknown>): string | undefined {
  const text = haystack(product);
  const brand = String(product.brand || "").toLowerCase();

  if (RADIO_CATEGORY_HINTS.some((h) => text.includes(h)) || RADIO_BRANDS.has(brand)) {
    return "radio";
  }
  if (CAMERA_CATEGORY_HINTS.some((h) => text.includes(h))) {
    return "camera";
  }
  if (product.output_format === "unifi" || NETWORKING_CATEGORY_HINTS.some((h) => text.includes(h))) {
    return "networking";
  }
  if (product.output_format === "mikrotik" || text.includes("routeros") || text.includes("mikrotik")) {
    return "networking";
  }
  if (text.includes("security systems") && !text.includes("radio")) {
    return "security";
  }
  return undefined;
}
