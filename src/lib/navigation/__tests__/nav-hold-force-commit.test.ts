import assert from "node:assert/strict";
import { describe, it, mock, afterEach } from "node:test";
import { readFile } from "node:fs/promises";
import {
  NAV_HOLD_FORCE_COMMIT_MS,
  armNavHoldForceCommit,
  clearNavHoldForceCommit,
} from "@/lib/navigation/nav-hold-force-commit";

describe("nav hold force commit", () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it("fires at 7500ms and can be cleared by a normal commit", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    let fired = 0;
    const timer = armNavHoldForceCommit(null, () => {
      fired += 1;
    });
    mock.timers.tick(NAV_HOLD_FORCE_COMMIT_MS - 1);
    assert.equal(fired, 0);
    mock.timers.tick(1);
    assert.equal(fired, 1);

    fired = 0;
    const pending = armNavHoldForceCommit(null, () => {
      fired += 1;
    });
    clearNavHoldForceCommit(pending);
    mock.timers.tick(NAV_HOLD_FORCE_COMMIT_MS);
    assert.equal(fired, 0);
    void timer;
    mock.timers.reset();
  });

  it("wires a per-navigation 7.5s hold timer and leaves the 4s escape behind hasCommittedRef", async () => {
    const source = await readFile(
      new URL("../../../components/motion/marketing-page-transition.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /armNavHoldForceCommit\(navHoldTimerRef\.current/);
    assert.match(source, /clearNavHoldTimer\(\)/);
    assert.match(source, /hasCommittedRef\.current\)/);
    assert.match(source, /clearPendingEscape\(\)/);
    assert.match(source, /emitRouteContentReady\(\)/);
    assert.doesNotMatch(source, /document\.startViewTransition\s*\(/);
  });
});
