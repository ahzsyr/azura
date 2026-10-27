import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const textEffectsSource = readFileSync(
  join(process.cwd(), "src/features/theme/effects/text.ts"),
  "utf8",
);
const themeEffectsClientSource = readFileSync(
  join(process.cwd(), "src/components/theme/theme-effects-client.tsx"),
  "utf8",
);

describe("scheduleAfterSelectiveHydration", () => {
  it("waits for LocaleBoot data-hydrated / azura:hydrated before mutating text", () => {
    assert.match(textEffectsSource, /dataset\.hydrated === "true"/);
    assert.match(textEffectsSource, /azura:hydrated/);
    assert.match(textEffectsSource, /MessageChannel/);
    assert.match(textEffectsSource, /requestIdleCallback/);
    // Must not rely on bare rAF+setTimeout alone (raced MessagePort hydrate → #418).
    assert.doesNotMatch(
      textEffectsSource,
      /export function scheduleAfterSelectiveHydration\(work: \(\) => void\): void \{\s*requestAnimationFrame\(\(\) => \{\s*window\.setTimeout/,
    );
  });

  it("typewriter keeps SSR text until the first interval tick", () => {
    assert.match(textEffectsSource, /Keep SSR text until the first interval tick/);
    assert.match(
      textEffectsSource,
      /if \(i === 0\) \{\s*el\.textContent = "";\s*\}/,
    );
  });
});

describe("ThemeEffectsClient mount bind", () => {
  it("defers initial apply through scheduleAfterSelectiveHydration", () => {
    assert.match(themeEffectsClientSource, /scheduleAfterSelectiveHydration/);
    assert.match(
      themeEffectsClientSource,
      /typewriter\/scramble cannot clear SSR heading text mid-hydrate \(#418\)/,
    );
  });
});
