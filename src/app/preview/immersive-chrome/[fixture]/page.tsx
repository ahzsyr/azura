import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ImmersiveChromeFixtureView } from "../fixture-view";
import {
  getImmersiveChromeFixture,
  IMMERSIVE_CHROME_FIXTURES,
  type ImmersiveChromeFixtureId,
} from "../fixtures";

type Props = {
  params: Promise<{ fixture: string }>;
};

export function generateStaticParams() {
  return IMMERSIVE_CHROME_FIXTURES.map((f) => ({ fixture: f.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fixture: id } = await params;
  const fixture = getImmersiveChromeFixture(id);
  return {
    title: fixture?.title ?? "Immersive chrome fixture",
    robots: { index: false, follow: false },
  };
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { fixture: id } = await params;
  const fixture = getImmersiveChromeFixture(id);
  const themeColor =
    fixture?.kind === "solid" && "color" in fixture ? fixture.color : "#111827";
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor,
  };
}

export default async function ImmersiveChromeFixturePage({ params }: Props) {
  const { fixture: id } = await params;
  const fixture = getImmersiveChromeFixture(id);
  if (!fixture) notFound();

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          zIndex: 50,
        }}
      >
        <Link
          href="/preview/immersive-chrome"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 12,
            textDecoration: "none",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          All fixtures
        </Link>
      </div>
      <ImmersiveChromeFixtureView fixtureId={fixture.id as ImmersiveChromeFixtureId} />
    </>
  );
}
