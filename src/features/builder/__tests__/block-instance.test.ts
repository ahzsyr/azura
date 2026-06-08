import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode } from "@/types/builder";
import {
  createBlockInstance,
  getBlockSettings,
  normalizeBlockInstance,
  upgradePageBlocksToV2,
} from "@/features/builder/instance/block-instance";

describe("block instance", () => {
  it("reads settings from legacy props", () => {
    const block: BlockNode = {
      id: "a",
      type: "hero",
      props: { titleEn: "Hello" },
    };
    assert.equal(getBlockSettings(block).titleEn, "Hello");
  });

  it("merges props-only media into normalized settings on save", () => {
    const block: BlockNode = {
      id: "cta1",
      type: "cta",
      version: "2.0",
      settings: { backgroundType: "image" },
      props: {
        backgroundType: "image",
        backgroundImageUrl: "/media/hero.jpg",
        backgroundMediaAssetId: "cmq557j4900001e04i0ik5sm4",
      },
    };
    const norm = normalizeBlockInstance(block);
    assert.equal(norm.settings.backgroundMediaAssetId, "cmq557j4900001e04i0ik5sm4");
    assert.equal(norm.settings.backgroundImageUrl, "/media/hero.jpg");
  });

  it("prefers settings over props when both define the same key", () => {
    const block: BlockNode = {
      id: "b",
      type: "text",
      props: { contentEn: "from-props" },
      settings: { contentEn: "from-settings" },
    };
    assert.equal(getBlockSettings(block).contentEn, "from-settings");
  });

  it("ignores empty settings defaults that mask props media on hero", () => {
    const block: BlockNode = {
      id: "h1",
      type: "hero",
      version: "2.0",
      settings: { mediaAssetId: "", imageUrl: "", titleEn: "Welcome" },
      props: {
        mediaAssetId: "cmq557j4900001e04i0ik5sm4",
        imageUrl: "/media/hero.jpg",
        titleEn: "Welcome",
      },
    };
    assert.equal(getBlockSettings(block).mediaAssetId, "cmq557j4900001e04i0ik5sm4");
    assert.equal(getBlockSettings(block).imageUrl, "/media/hero.jpg");
    const norm = normalizeBlockInstance(block);
    assert.equal(norm.settings.mediaAssetId, "cmq557j4900001e04i0ik5sm4");
    const upgraded = upgradePageBlocksToV2([block]);
    assert.equal(upgraded[0]?.props?.mediaAssetId, "cmq557j4900001e04i0ik5sm4");
    assert.equal(upgraded[0]?.settings?.mediaAssetId, "cmq557j4900001e04i0ik5sm4");
  });

  it("supports unlimited instances of same type", () => {
    const a = createBlockInstance("hero", { settings: { titleEn: "A" } });
    const b = createBlockInstance("hero", { settings: { titleEn: "B" } });
    assert.notEqual(a.id, b.id);
    assert.equal(getBlockSettings(a).titleEn, "A");
    assert.equal(getBlockSettings(b).titleEn, "B");
  });

  it("upgrades v1 blocks to v2 with dual-write", () => {
    const legacy: BlockNode[] = [
      { id: "h1", type: "text", props: { contentEn: "x" } },
    ];
    const upgraded = upgradePageBlocksToV2(legacy);
    assert.equal(upgraded[0]?.version, "2.0");
    assert.equal(upgraded[0]?.settings?.contentEn, "x");
    assert.equal(upgraded[0]?.props?.contentEn, "x");
  });

  it("normalizes hero imageUrl through upgrade pipeline", () => {
    const block: BlockNode = {
      id: "h2",
      type: "hero",
      version: "2.0",
      settings: {
        titleEn: "Welcome",
        imageUrl: "https://cdn.example/hero.jpg",
        mediaAssetId: "cmq56fhnv0000150467cng4pm",
        backgroundType: "image",
      },
      props: {
        titleEn: "Welcome",
        imageUrl: "https://cdn.example/hero.jpg",
        mediaAssetId: "cmq56fhnv0000150467cng4pm",
        backgroundType: "image",
      },
    };
    const norm = normalizeBlockInstance(block);
    assert.equal(norm.settings.imageUrl, "https://cdn.example/hero.jpg");
    const upgraded = upgradePageBlocksToV2([block]);
    assert.equal(upgraded[0]?.settings?.imageUrl, "https://cdn.example/hero.jpg");
  });
});
