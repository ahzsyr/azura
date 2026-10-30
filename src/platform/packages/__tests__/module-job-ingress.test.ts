import assert from "node:assert/strict";
import test from "node:test";
import { decideModuleJobIngress } from "@/platform/packages/module-job-ingress";

test("decideModuleJobIngress requires ingress and auth", () => {
  assert.deepEqual(
    decideModuleJobIngress({ ingressAllow: true, auth: "ok" }),
    { allow: true },
  );
  assert.equal(
    decideModuleJobIngress({ ingressAllow: false, ingressReason: "runtime_inactive", auth: "ok" })
      .allow,
    false,
  );
  assert.equal(
    decideModuleJobIngress({ ingressAllow: true, auth: "unauthorized" }).allow,
    false,
  );
});
