import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIMARY_MARKERS,
  RELEASE_GATE,
  buildBlockedSummary,
  classifyNextRel,
  decideBoundaryVerdict,
  sha256Text,
} from "../measure-profile-boundary-lib.mjs";
import { preflightMeasureToolchain } from "../preflight-measure-toolchain.mjs";

test("sha256Text is stable", () => {
  assert.equal(sha256Text("abc"), sha256Text("abc"));
  assert.notEqual(sha256Text("abc"), sha256Text("abd"));
});

test("classifyNextRel separates client, server, metadata", () => {
  assert.equal(classifyNextRel(".next/static/chunks/app.js"), "clientChunks");
  assert.equal(classifyNextRel(".next/server/app/page.js"), "serverChunks");
  assert.equal(classifyNextRel(".next/static/chunks/app.js.map"), "metadata");
  assert.equal(classifyNextRel(".next/build-manifest.json"), "metadata");
});

test("decideBoundaryVerdict: equal hits → finished inconclusive", () => {
  const scan = {
    clientChunks: { hitCount: 2 },
    serverChunks: { hitCount: 3 },
  };
  const result = decideBoundaryVerdict(scan, scan);
  assert.equal(result.verdict, "inconclusive");
});

test("decideBoundaryVerdict: enterprise-only delta → conclusive marker-delta", () => {
  const result = decideBoundaryVerdict(
    { clientChunks: { hitCount: 2 }, serverChunks: { hitCount: 1 } },
    { clientChunks: { hitCount: 0 }, serverChunks: { hitCount: 0 } },
  );
  assert.equal(result.verdict, "conclusive");
  assert.match(result.rationale, /marker-delta claim only/i);
});

test("buildBlockedSummary pins docs-only release gate and Phase 6 shape", () => {
  const summary = buildBlockedSummary({
    preflight: {
      blockReason: "no-candidate-binary",
      toolchain: { execPath: "/tmp/node", swcOk: false },
      candidateEnumeration: { usableCandidates: [] },
    },
    error: "test",
  });
  assert.equal(summary.phase, "6");
  assert.equal(summary.status, "blocked");
  assert.equal(summary.verdict, "blocked");
  assert.deepEqual(summary.releaseGate, RELEASE_GATE);
  assert.equal(summary.releaseGate.exclusionCiGate, false);
  assert.ok(PRIMARY_MARKERS[0].startsWith("AZURA_MODULE_BOUNDARY:"));
});

test("preflightMeasureToolchain rejects ephemeral session runtimes for Complete", () => {
  const result = preflightMeasureToolchain();
  assert.equal(typeof result.ok, "boolean");
  assert.equal(result.releaseGate.exclusionCiGate, false);
  assert.ok(result.nextBinPresent === true || result.blockReason === "next-bin-missing");
  // On agent machines, current execPath is typically ephemeral → not Complete.
  if (result.toolchain?.execPath) {
    const ephemeralFrags = [
      "Codex/artifact-sessions",
      "codex-runtimes",
      "cua_node",
      "dsh-runtimes",
      "dsh-primary-runtime",
      "cursor-agent",
    ];
    const isEphemeral = ephemeralFrags.some((f) =>
      result.toolchain.execPath.replace(/\\/g, "/").includes(f),
    );
    if (isEphemeral) {
      assert.equal(result.ok, false);
      assert.ok(
        result.blockReason === "ephemeral-runtime" ||
          result.blockReason === "no-candidate-binary" ||
          result.blockReason === "swc-team-id-or-load-failed" ||
          result.blockReason === "exec-path-not-durable",
      );
    }
  }
});
