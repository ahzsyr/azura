import type { Metadata, Viewport } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Safari tint lab",
  robots: { index: false, follow: false },
};

type Edge = "none" | "clear" | "color" | "gradient";
type HtmlBg = "color" | "transparent";

const EDGES: Edge[] = ["none", "clear", "color", "gradient"];

const PRESETS: { label: string; top: Edge; bottom: Edge; htmlbg: HtmlBg; fit: "cover" | "auto"; note: string }[] = [
  {
    label: "A · no strips, opaque page",
    top: "none",
    bottom: "none",
    htmlbg: "color",
    fit: "cover",
    note: "Current live failure: Safari samples the canvas and paints a solid bar.",
  },
  {
    label: "B · no strips, transparent page",
    top: "none",
    bottom: "none",
    htmlbg: "transparent",
    fit: "cover",
    note: "Candidate for the clock: nothing fixed at the top, hero is the sample.",
  },
  {
    label: "C · clear strips both edges",
    top: "clear",
    bottom: "clear",
    htmlbg: "transparent",
    fit: "cover",
    note: "Earlier result: bottom went glass, top went black.",
  },
  {
    label: "D · no top strip, clear bottom",
    top: "none",
    bottom: "clear",
    htmlbg: "transparent",
    fit: "cover",
    note: "Engine default for Transparent and Glass. Clock from the hero, toolbar from a clear strip.",
  },
  {
    label: "E · solid color both edges",
    top: "color",
    bottom: "color",
    htmlbg: "color",
    fit: "cover",
    note: "Solid style. Gold bands should fill the status bar and the toolbar.",
  },
  {
    label: "F · gradient both edges",
    top: "gradient",
    bottom: "gradient",
    htmlbg: "transparent",
    fit: "cover",
    note: "Gradient style. Gold fades into the hero from the top and the bottom.",
  },
  {
    label: "G · clear bottom, viewport-fit auto",
    top: "none",
    bottom: "clear",
    htmlbg: "transparent",
    fit: "auto",
    note: "Edge-to-edge off. The page should sit below the clock.",
  },
  {
    label: "H · clear top only, opaque page",
    top: "clear",
    bottom: "none",
    htmlbg: "color",
    fit: "cover",
    note: "Isolates a clear top strip against an opaque page background.",
  },
];

function one(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : fallback;
}

function asEdge(value: string): Edge {
  return EDGES.includes(value as Edge) ? (value as Edge) : "none";
}

export async function generateViewport({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Viewport> {
  const sp = await searchParams;
  const fit = one(sp.fit, "cover") === "auto" ? "auto" : "cover";
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: fit,
  };
}

export default async function TintLabPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const top = asEdge(one(sp.top, "none"));
  const bottom = asEdge(one(sp.bottom, "clear"));
  const htmlbg: HtmlBg = one(sp.htmlbg, "transparent") === "color" ? "color" : "transparent";
  const fit = one(sp.fit, "cover") === "auto" ? "auto" : "cover";
  const href = (preset: (typeof PRESETS)[number]) =>
    `/preview/tint-lab?top=${preset.top}&bottom=${preset.bottom}&htmlbg=${preset.htmlbg}&fit=${preset.fit}`;

  const pageBg = htmlbg === "transparent" ? "transparent" : "#f4efe4";
  const show = (edge: Edge) => edge !== "none";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html[data-tint-lab], html[data-tint-lab] body { background: ${pageBg} !important; }
            #lab-top, #lab-bottom {
              position: fixed; left: 0; right: 0; z-index: 2147483000;
              pointer-events: none; display: block;
            }
            #lab-top { top: 0; }
            #lab-bottom { bottom: 0; }
            #lab-top[data-edge="clear"], #lab-bottom[data-edge="clear"] {
              height: 2px; background: transparent;
            }
            #lab-top[data-edge="color"] {
              height: max(2px, env(safe-area-inset-top, 0px));
              background: #d8c180;
            }
            #lab-bottom[data-edge="color"] {
              min-height: max(12px, env(safe-area-inset-bottom, 0px));
              background: #d8c180;
            }
            #lab-top[data-edge="gradient"] {
              height: calc(env(safe-area-inset-top, 0px) + 48px);
              background: linear-gradient(to bottom, #d8c180 0%, transparent 100%);
            }
            #lab-bottom[data-edge="gradient"] {
              height: calc(env(safe-area-inset-bottom, 0px) + 48px);
              background: linear-gradient(to top, #d8c180 0%, transparent 100%);
            }
            .lab-hero {
              min-height: 100vh;
              background:
                linear-gradient(to bottom, rgba(0,0,0,.15), rgba(255,255,255,.82)),
                linear-gradient(160deg, #1d4e89 0%, #e8a87c 38%, #f6d365 62%, #f7f3ea 100%);
            }
          `,
        }}
      />
      {show(top) ? <div id="lab-top" data-edge={top} aria-hidden="true" /> : null}
      {show(bottom) ? <div id="lab-bottom" data-edge={bottom} aria-hidden="true" /> : null}
      <main className="lab-hero" style={{ fontFamily: "system-ui, sans-serif", color: "#1c1917" }}>
        <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 28px) 20px 24px" }}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.04em" }}>SAFARI TINT LAB</p>
          <h1 style={{ margin: "8px 0 0", fontSize: 28 }}>top {top} · bottom {bottom}</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15 }}>
            html background {htmlbg} · viewport-fit {fit}
          </p>
        </div>
        <section style={{ padding: "12px 20px 48px" }}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Open on an iPhone</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {PRESETS.map((preset) => {
              const active =
                preset.top === top &&
                preset.bottom === bottom &&
                preset.htmlbg === htmlbg &&
                preset.fit === fit;
              return (
                <li key={preset.label}>
                  <Link
                    href={href(preset)}
                    style={{
                      display: "block",
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: active ? "#1c1917" : "rgba(255,255,255,.72)",
                      color: active ? "#fafafa" : "#1c1917",
                      textDecoration: "none",
                    }}
                  >
                    <strong>{preset.label}</strong>
                    <span style={{ display: "block", fontSize: 13, marginTop: 4 }}>{preset.note}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div style={{ height: "120vh" }} />
          <p>End of the lab page. The bottom edge above this line is the sample.</p>
        </section>
      </main>
    </>
  );
}
