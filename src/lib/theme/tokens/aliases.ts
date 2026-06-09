import type { CanonicalSemanticToken } from "./semantic";

/**
 * Legacy alias → canonical semantic token.
 * Temporary migration layer — do not remove until Phase 5.
 */
export const LEGACY_ALIAS_MAP: Record<string, CanonicalSemanticToken | string> = {
  "--az-bg-primary": "--background",
  "--az-bg-secondary": "--card",
  "--az-text-primary": "--foreground",
  "--az-text-secondary": "--muted-foreground",
  "--az-color-bg": "--background",
  "--az-color-surface": "--card",
  "--az-color-text": "--foreground",
  "--az-color-muted": "--muted-foreground",
  "--az-color-border": "--border",
  "--az-border-subtle": "--border",
  "--az-color-primary": "--primary",
  "--az-color-accent": "--accent",
  "--az-color-secondary": "--accent",
  "--az-accent": "--accent",
  "--color-primary": "--primary",
  "--color-accent": "--accent",
  "--color-secondary": "--accent",
  "--color-bg": "--background",
  "--color-surface": "--card",
  "--color-text": "--foreground",
  "--color-text-muted": "--muted-foreground",
  "--color-border": "--border",
  "--bg-primary": "--background",
  "--bg-secondary": "--card",
  "--text-primary": "--foreground",
  "--text-secondary": "--muted-foreground",
  "--bg": "--background",
  "--sur": "--card",
  "--t": "--foreground",
  "--m": "--muted-foreground",
  "--p": "--primary",
  "--a": "--accent",
  "--s2": "--accent",
  "--border-subtle": "--border",
  "--input": "--border",
  "--popover": "--card",
  "--popover-foreground": "--foreground",
  "--card-foreground": "--foreground",
};

/** Extra aliases that reference other computed tokens (not direct semantic). */
const COMPUTED_ALIASES: Record<string, string> = {
  "--gold": "--accent",
  "--emerald": "--primary",
  "--emerald-dark": "--primary",
};

export function buildAliasDeclarations(): string[] {
  const lines: string[] = [];

  for (const [alias, target] of Object.entries(LEGACY_ALIAS_MAP)) {
    const ref = target.startsWith("--") ? `var(${target})` : target;
    lines.push(`${alias}:${ref}`);
  }

  for (const [alias, target] of Object.entries(COMPUTED_ALIASES)) {
    lines.push(`${alias}:var(${target})`);
  }

  return lines;
}

/** SSR CSS block — legacy aliases generated from canonical semantic tokens. */
export function buildAliasCss(): string {
  const aliases = buildAliasDeclarations().join(";");
  return `html {
    ${aliases};
  }
  html.dark {
    ${aliases};
  }`;
}

/** Apply legacy aliases on an element from current semantic values (client). */
export function applyAliasVars(
  el: HTMLElement,
  semantic: Partial<Record<string, string>>,
): void {
  for (const [alias, target] of Object.entries(LEGACY_ALIAS_MAP)) {
    const key = target as string;
    const value = semantic[key] ?? getComputedStyle(el).getPropertyValue(key).trim();
    if (value) {
      el.style.setProperty(alias, value);
    }
  }
}
