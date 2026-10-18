import test from "node:test";
import assert from "node:assert/strict";
import {
  isPreSetupWelcomePath,
  shouldRedirectToPreSetupWelcome,
} from "@/features/setup/setup-middleware";

const incomplete = { confident: true, setupComplete: false };
const complete = { confident: true, setupComplete: true };
const uncertain = { confident: false, setupComplete: false };

test("pre-setup welcome holds public pages only when status is confidently incomplete", () => {
  assert.equal(shouldRedirectToPreSetupWelcome("/", incomplete), true);
  assert.equal(shouldRedirectToPreSetupWelcome("/products", incomplete), true);
  assert.equal(shouldRedirectToPreSetupWelcome("/en/about", incomplete), true);
  assert.equal(shouldRedirectToPreSetupWelcome("/welcome", incomplete), false);
  assert.equal(shouldRedirectToPreSetupWelcome("/setup", incomplete), false);
  assert.equal(shouldRedirectToPreSetupWelcome("/api/setup/status", incomplete), false);
  assert.equal(shouldRedirectToPreSetupWelcome("/admin", incomplete), false);
  assert.equal(shouldRedirectToPreSetupWelcome("/", complete), false);
  assert.equal(shouldRedirectToPreSetupWelcome("/", uncertain), false);
});

test("welcome path matches locale-free and locale-prefixed URLs", () => {
  assert.equal(isPreSetupWelcomePath("/welcome"), true);
  assert.equal(isPreSetupWelcomePath("/en/welcome"), true);
  assert.equal(isPreSetupWelcomePath("/welcome-tour"), false);
});
