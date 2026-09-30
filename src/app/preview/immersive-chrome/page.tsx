import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { IMMERSIVE_CHROME_FIXTURES } from "./fixtures";

export const metadata: Metadata = {
  title: "Immersive chrome fixtures",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#111827" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function ImmersiveChromeFixtureIndex() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        background: "#0b1220",
        color: "#e5e7eb",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Immersive chrome audit fixtures</h1>
      <p style={{ opacity: 0.8, maxWidth: 640, lineHeight: 1.5 }}>
        Temporary routes for Chrome Android / Samsung Internet experiments. Open each URL on a
        real device, capture env (Android/Chrome/Samsung versions, gesture vs 3-button, PWA,
        Material You), then record Theme Color / Dynamic Chrome / Dynamic Toolbar behavior.
      </p>
      <ol style={{ marginTop: 24, paddingLeft: 20, lineHeight: 1.8 }}>
        {IMMERSIVE_CHROME_FIXTURES.map((fixture) => (
          <li key={fixture.id}>
            <Link
              href={`/preview/immersive-chrome/${fixture.id}`}
              style={{ color: "#38bdf8" }}
            >
              {fixture.title}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
