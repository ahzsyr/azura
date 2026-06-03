/** Read theme CSS vars with fallbacks for Astro-compat aliases. */
export function getThemeColor(name: string): string {
  const style = getComputedStyle(document.documentElement);
  const fallbacks: Record<string, string[]> = {
    "--color-primary": ["--color-primary", "--primary"],
    "--color-accent": ["--color-accent", "--accent"],
    "--color-secondary": ["--color-secondary", "--gold"],
  };
  const keys = fallbacks[name] ?? [name];
  for (const key of keys) {
    const value = style.getPropertyValue(key).trim();
    if (value) return value;
  }
  return "#047857";
}
