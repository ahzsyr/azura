import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoHeroView } from "@/features/builder/blocks/media/components/video-hero-view";

describe("VideoHeroView", () => {
  it("keeps background video non-interactive when controls are disabled", () => {
    const html = renderToStaticMarkup(
      <VideoHeroView title="Hero title" videoUrl="/hero.mp4" showControls={false} />,
    );

    assert.match(html, /<video[^>]*class="[^"]*pointer-events-none[^"]*"/);
    assert.match(html, /<video[^>]*preload="auto"/);
    assert.doesNotMatch(html, /<video[^>]*\scontrols(?:=| |>)/);
  });

  it("renders native controls when enabled", () => {
    const html = renderToStaticMarkup(
      <VideoHeroView title="Hero title" videoUrl="/hero.mp4" showControls />,
    );

    assert.match(html, /<video[^>]*\scontrols(?:=| |>)/);
  });

  it("hides slide navigation when slide controls are disabled", () => {
    const html = renderToStaticMarkup(
      <VideoHeroView
        title="Hero title"
        mediaMode="featured"
        slides={[
          { id: "1", videoUrl: "/a.mp4", videoMediaAssetId: "", imageUrl: "", imageMediaAssetId: "", posterUrl: "", caption: "" },
          { id: "2", videoUrl: "/b.mp4", videoMediaAssetId: "", imageUrl: "", imageMediaAssetId: "", posterUrl: "", caption: "" },
        ]}
        showSlideArrows={false}
        showSlideDots={false}
      />,
    );

    assert.doesNotMatch(html, /aria-label="Previous slide"/);
    assert.doesNotMatch(html, /aria-label="Next slide"/);
    assert.doesNotMatch(html, /aria-label="Slide 1"/);
  });

  it("renders animated slide layers for featured multi-slide heroes", () => {
    const html = renderToStaticMarkup(
      <VideoHeroView
        title="Hero title"
        mediaMode="featured"
        slides={[
          { id: "1", videoUrl: "/a.mp4", videoMediaAssetId: "", imageUrl: "", imageMediaAssetId: "", posterUrl: "", caption: "First" },
          { id: "2", videoUrl: "/b.mp4", videoMediaAssetId: "", imageUrl: "", imageMediaAssetId: "", posterUrl: "", caption: "Second" },
        ]}
      />,
    );

    assert.match(html, /<video[^>]*src="\/a\.mp4"/);
    assert.doesNotMatch(html, /<video[^>]*\sloop(?:=| |>)/);
    assert.match(html, /aria-label="Slide 1"/);
    assert.match(html, /aria-label="Slide 2"/);
  });
});
