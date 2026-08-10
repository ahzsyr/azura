/**
 * Temporary immersive-chrome audit fixtures (throwaway).
 * Open via /preview/immersive-chrome and /preview/immersive-chrome/[id]
 */

export const IMMERSIVE_CHROME_FIXTURES = [
  {
    id: "solid-red",
    title: "1. Solid red — no header",
    kind: "solid" as const,
    color: "#ff0000",
    header: "none" as const,
  },
  {
    id: "solid-green",
    title: "2. Solid green — no header",
    kind: "solid" as const,
    color: "#00ff00",
    header: "none" as const,
  },
  {
    id: "solid-blue",
    title: "3. Solid blue — no header",
    kind: "solid" as const,
    color: "#0000ff",
    header: "none" as const,
  },
  {
    id: "hero-image",
    title: "4. Full-bleed hero image — no header",
    kind: "image" as const,
    header: "none" as const,
  },
  {
    id: "hero-with-site-header",
    title: "5. Hero + opaque site-like header",
    kind: "image" as const,
    header: "opaque" as const,
  },
  {
    id: "hero-transparent-header",
    title: "6. Hero + transparent header",
    kind: "image" as const,
    header: "transparent" as const,
  },
  {
    id: "video",
    title: "7. Full-screen video — no header",
    kind: "video" as const,
    header: "none" as const,
  },
  {
    id: "gradient",
    title: "8. Full-bleed CSS gradient — no header",
    kind: "gradient" as const,
    header: "none" as const,
  },
  {
    id: "hero-opaque-header",
    title: "9. Opaque header over image",
    kind: "image" as const,
    header: "opaque" as const,
  },
  {
    id: "hero-blurred-header",
    title: "10. Blurred (backdrop-filter) header over image",
    kind: "image" as const,
    header: "blurred" as const,
  },
] as const;

export type ImmersiveChromeFixtureId = (typeof IMMERSIVE_CHROME_FIXTURES)[number]["id"];

export function getImmersiveChromeFixture(id: string) {
  return IMMERSIVE_CHROME_FIXTURES.find((f) => f.id === id) ?? null;
}
