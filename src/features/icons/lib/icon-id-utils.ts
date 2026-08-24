import { MARKETING_ICON_OPTIONS } from "@/features/builder/blocks/marketing/lib/icon-map";
import { resolveBuiltinLucideIcon } from "./builtin-icons";

// `MARKETING_ICON_OPTIONS` is typed with literal icon `value` strings.
// We widen to `Set<string>` so `.has()` accepts runtime `string` safely.
const LEGACY_MARKETING_ICON_VALUES: Set<string> = new Set(
  MARKETING_ICON_OPTIONS.map((option) => option.value),
);
const ICON_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when a stored value should use Icon Library resolution (iconId), not legacy marketing keys. */
export function looksLikeIconLibraryId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (resolveBuiltinLucideIcon(trimmed)) return true;
  if (trimmed.startsWith("font-")) return true;
  if (LEGACY_MARKETING_ICON_VALUES.has(trimmed)) return false;
  return ICON_ID_RE.test(trimmed);
}
