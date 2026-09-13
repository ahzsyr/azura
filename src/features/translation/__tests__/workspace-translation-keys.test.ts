import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWorkspaceOverrideKey,
  parseWorkspaceOverrideKey,
  workspaceOverrideMapToInputs,
} from "@/features/translation/workspace-translation-keys";

describe("workspace translation keys", () => {
  it("builds and parses override keys with entity type", () => {
    const key = buildWorkspaceOverrideKey("MenuItem", "abc123", "label", "ar");
    assert.equal(key, "MenuItem|||abc123|||label|||ar");
    assert.deepEqual(parseWorkspaceOverrideKey(key), {
      entityType: "MenuItem",
      entityId: "abc123",
      field: "label",
      localeCode: "ar",
    });
  });

  it("serializes override map to EntityTranslation inputs", () => {
    const map = new Map([
      [buildWorkspaceOverrideKey("Footer", "foot1", "tagline", "ar"), "لاحقة"],
    ]);
    const inputs = workspaceOverrideMapToInputs(map);
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0]?.entityType, "Footer");
    assert.equal(inputs[0]?.field, "tagline");
    assert.equal(inputs[0]?.localeCode, "ar");
    assert.equal(inputs[0]?.value, "لاحقة");
  });
});
