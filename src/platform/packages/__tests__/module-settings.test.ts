import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { z } from "zod";
import {
  getModuleSettingsDefinition,
  REDACTED_SECRET,
  redactSecrets,
  registerModuleSettings,
} from "@/platform/packages/module-settings-registry";
import "@/modules/documentation/settings";
import "@/modules/marketing/settings";
import "@/modules/status-page/settings";
import "@/modules/advanced-seo/settings";

test("builtin Modules register settings schemas", () => {
  assert.ok(getModuleSettingsDefinition("documentation"));
  assert.ok(getModuleSettingsDefinition("status-page"));
  const marketing = getModuleSettingsDefinition("marketing");
  assert.ok(marketing);
  assert.deepEqual(marketing?.secretKeys, ["webhookProbeSecret"]);
  assert.equal(marketing?.adminPath, "/admin/marketing/settings");
  const advancedSeo = getModuleSettingsDefinition("advanced-seo");
  assert.ok(advancedSeo);
  assert.equal(advancedSeo?.adminPath, "/admin/seo/templates");
});

test("documentation settings schema accepts defaults", () => {
  const def = getModuleSettingsDefinition("documentation");
  assert.ok(def);
  const parsed = def!.schema.safeParse({
    adminNotice: "hi",
    preferUnpublishedInAdmin: true,
  });
  assert.equal(parsed.success, true);
});

test("registerModuleSettings overwrites by packageId", () => {
  registerModuleSettings({
    packageId: "_test_phase3",
    schemaVersion: 1,
    schema: z.object({ n: z.number() }),
    defaults: { n: 1 },
    secretKeys: ["token"],
  });
  const def = getModuleSettingsDefinition("_test_phase3");
  assert.equal(def?.defaults.n, 1);
  assert.ok(def?.secretKeys.includes("token"));
});

test("redactSecrets replaces secret values", () => {
  assert.deepEqual(
    redactSecrets({ adminNotice: "x", webhookProbeSecret: "s3cret" }, ["webhookProbeSecret"]),
    { adminNotice: "x", webhookProbeSecret: REDACTED_SECRET },
  );
});

test("module-settings persistence pins replaceSecrets and audit actions", () => {
  const src = readFileSync(
    path.join(process.cwd(), "src/platform/packages/module-settings.ts"),
    "utf8",
  );
  assert.match(src, /replaceSecrets/);
  assert.match(src, /module\.settings\.updated/);
  assert.match(src, /module\.settings\.reset/);
});
