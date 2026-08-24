import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PageBlocks } from "@/types/builder";
import { updateBlockInTree } from "@/features/builder/block-tree";
import { patchBlockMedia } from "@/features/builder/instance/block-instance";

type PageFormState = {
  blocks: PageBlocks;
  slug: string;
};

/** Mirrors page-editor updateFormState ref sync for save-guard reads. */
function applyFormPatch(
  prev: PageFormState,
  ref: { current: PageFormState },
  patch: Partial<PageFormState>,
): PageFormState {
  const next = { ...prev, ...patch };
  ref.current = next;
  return next;
}

describe("page editor formStateRef sync", () => {
  it("syncs ref when blocks are patched before a mock re-render", () => {
    const ref = { current: { blocks: [] as PageBlocks, slug: "home" } };
    let state = ref.current;

    const heroBlock = {
      id: "hero-1",
      type: "hero" as const,
      props: { titleEn: "Welcome", imageUrl: "", mediaAssetId: "" },
    };
    state = applyFormPatch(state, ref, { blocks: [heroBlock] });

    const updated = patchBlockMedia(
      heroBlock,
      { urlKey: "imageUrl", mediaIdKey: "mediaAssetId", typeKey: "backgroundType" },
      { url: "https://cdn.example/hero.jpg", mediaId: "cmq56fhnv0000150467cng4pm" },
    );
    const nextBlocks = updateBlockInTree(state.blocks, "hero-1", () => updated);
    state = applyFormPatch(state, ref, { blocks: nextBlocks });

    const savedHero = ref.current.blocks[0];
    assert.equal(savedHero?.props?.imageUrl, "https://cdn.example/hero.jpg");
    assert.equal(savedHero?.props?.mediaAssetId, "cmq56fhnv0000150467cng4pm");
    assert.equal(savedHero?.settings?.imageUrl, "https://cdn.example/hero.jpg");
  });
});
