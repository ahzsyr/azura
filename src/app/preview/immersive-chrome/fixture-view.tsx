import type { ImmersiveChromeFixtureId } from "./fixtures";
import { getImmersiveChromeFixture } from "./fixtures";

const HERO_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0ea5e9"/>
          <stop offset="50%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#f43f5e"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="1800" fill="url(#g)"/>
      <text x="60" y="160" fill="white" font-family="sans-serif" font-size="72" font-weight="700">HERO</text>
    </svg>`,
  );

type Props = {
  fixtureId: ImmersiveChromeFixtureId;
};

export function ImmersiveChromeFixtureView({ fixtureId }: Props) {
  const fixture = getImmersiveChromeFixture(fixtureId);
  if (!fixture) return null;

  const showHeader = fixture.header !== "none";
  const headerStyle =
    fixture.header === "opaque"
      ? ({
          background: "#111827",
          color: "#fff",
        } as const)
      : fixture.header === "blurred"
        ? ({
            background: "rgba(17, 24, 39, 0.45)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "#fff",
          } as const)
        : ({
            background: "transparent",
            color: "#fff",
          } as const);

  return (
    <div
      style={{
        margin: 0,
        minHeight: "200vh",
        position: "relative",
        fontFamily: "system-ui, sans-serif",
        color: "#fff",
      }}
    >
      {fixture.kind === "solid" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: fixture.color,
            zIndex: 0,
          }}
        />
      )}
      {fixture.kind === "gradient" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "linear-gradient(160deg, #f59e0b 0%, #ef4444 40%, #8b5cf6 100%)",
            zIndex: 0,
          }}
        />
      )}
      {fixture.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={HERO_IMAGE}
          alt=""
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />
      )}
      {fixture.kind === "video" && (
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            background: "#000",
          }}
        >
          <source
            src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
            type="video/mp4"
          />
        </video>
      )}

      {showHeader ? (
        <header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            height: 64,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            paddingTop: "env(safe-area-inset-top, 0px)",
            boxSizing: "border-box",
            ...headerStyle,
          }}
        >
          <strong style={{ fontSize: 14 }}>Fixture header ({fixture.header})</strong>
        </header>
      ) : null}

      <main
        style={{
          position: "relative",
          zIndex: 1,
          padding: showHeader ? "96px 20px 40px" : "40px 20px",
          maxWidth: 560,
        }}
      >
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            background: "rgba(0,0,0,0.55)",
            borderRadius: 8,
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          <strong>{fixture.title}</strong>
          <br />
          Scroll down. Observe Chrome/Samsung address bar / chin. Record Theme Color vs
          Dynamic Chrome vs Dynamic Toolbar.
        </p>
        <div style={{ height: "140vh" }} aria-hidden />
        <p style={{ background: "rgba(0,0,0,0.55)", padding: 12, borderRadius: 8 }}>
          Bottom of fixture — confirm toolbar retraction on scroll.
        </p>
      </main>
    </div>
  );
}
