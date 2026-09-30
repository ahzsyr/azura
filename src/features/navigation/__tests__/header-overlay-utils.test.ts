import test from "node:test";
import assert from "node:assert/strict";
import { getLiveHeaderRoot } from "@/features/navigation/header-overlay-utils";

test("getLiveHeaderRoot prefers the live header over the SSR shell", () => {
  const live = { id: "headerRoot", dataset: {} } as unknown as HTMLElement;
  const shell = { id: "headerRoot", dataset: { headerShell: "true" } } as unknown as HTMLElement;
  const doc = {
    querySelector: (selector: string) =>
      selector.includes(":not([data-header-shell])") ? live : shell,
    getElementById: () => shell,
  } as unknown as Document;

  assert.equal(getLiveHeaderRoot(doc), live);
});

test("getLiveHeaderRoot falls back when only the shell exists", () => {
  const shell = { id: "headerRoot" } as unknown as HTMLElement;
  const doc = {
    querySelector: () => null,
    getElementById: () => shell,
  } as unknown as Document;

  assert.equal(getLiveHeaderRoot(doc), shell);
});
