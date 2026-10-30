/**
 * Pure helpers for Phase 6 matched-twin boundary measure (unit-tested).
 */
import crypto from "node:crypto";

export const PRIMARY_MARKERS = ["AZURA_MODULE_BOUNDARY:marketing"];
export const SECONDARY_MARKERS = [
  "modules/marketing",
  "modules\\\\marketing",
  "@/modules/marketing",
];

export const RELEASE_GATE = Object.freeze({
  exclusionCiGate: false,
  decision: "docs-only",
});

export function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function emptyBuckets() {
  return {
    clientChunks: { hitCount: 0, files: [] },
    serverChunks: { hitCount: 0, files: [] },
    metadata: { hitCount: 0, files: [] },
  };
}

export function classifyNextRel(relPosix) {
  if (
    relPosix.endsWith(".map") ||
    relPosix.includes("build-manifest") ||
    relPosix.includes("app-build-manifest") ||
    relPosix.includes("react-loadable-manifest") ||
    relPosix.endsWith(".nft.json") ||
    relPosix.includes("/trace") ||
    relPosix.endsWith("/trace") ||
    relPosix.includes("traces")
  ) {
    return "metadata";
  }
  if (!relPosix.endsWith(".js") && !relPosix.endsWith(".json")) {
    return null;
  }
  if (relPosix.startsWith(".next/static/chunks/") && relPosix.endsWith(".js")) {
    return "clientChunks";
  }
  if (
    (relPosix.startsWith(".next/server/") || relPosix.includes("/server/")) &&
    relPosix.endsWith(".js")
  ) {
    return "serverChunks";
  }
  if (relPosix.endsWith(".js") && relPosix.startsWith(".next/")) return "serverChunks";
  if (relPosix.endsWith(".json")) return "metadata";
  return null;
}

/**
 * Decide twin verdict from primary-marker executable-chunk buckets.
 * Secondary path substrings are informational only.
 */
export function decideBoundaryVerdict(enterpriseScan, twinScan) {
  const eClient = enterpriseScan.clientChunks.hitCount;
  const tClient = twinScan.clientChunks.hitCount;
  const eServer = enterpriseScan.serverChunks.hitCount;
  const tServer = twinScan.serverChunks.hitCount;

  const clientDelta = eClient - tClient;
  const serverDelta = eServer - tServer;

  const interpretable =
    (clientDelta !== 0 && (eClient > 0 || tClient > 0)) ||
    (serverDelta !== 0 && (eServer > 0 || tServer > 0));

  if (!interpretable) {
    return {
      verdict: "inconclusive",
      rationale:
        "No interpretable client/server chunk primary-marker delta between matched twins. " +
        "Hits may be equal (accepted coupling / shared imports), zero on both (marker not retained), " +
        "or metadata-only. Absence of a marker is not proof of exclusion.",
    };
  }

  return {
    verdict: "conclusive",
    rationale:
      `Matched-twin primary-marker scan shows an executable-chunk marker delta ` +
      `(client ${eClient}→${tClient}, server ${eServer}→${tServer}) attributable to Marketing inclusion under the stated method. ` +
      `This is a marker-delta claim only — not an exclusion proof.`,
  };
}

export function buildBlockedSummary({ preflight, error }) {
  return {
    phase: "6",
    measuredAt: new Date().toISOString(),
    pair: "enterprise vs enterprise-minus-marketing",
    status: "blocked",
    verdict: "blocked",
    blockReason: preflight?.blockReason || "measure-aborted",
    toolchain: preflight?.toolchain ?? null,
    candidateEnumeration: preflight?.candidateEnumeration ?? null,
    profileGating: {
      enterpriseAssertOk: false,
      twinExpectMarketingAbsentOk: false,
      notes: ["Measure did not finish — gating asserts not recorded for this run."],
    },
    bundleEvidence: {
      markerMethod: "boundary-marker+substring",
      primaryMarkers: PRIMARY_MARKERS,
      secondaryMarkers: SECONDARY_MARKERS,
      enterpriseBuckets: null,
      twinBuckets: null,
      deltas: { clientChunks: 0, serverChunks: 0, metadata: 0 },
      limitations:
        "Blocked before or during twin Hostinger builds. No finished bundle evidence.",
    },
    releaseGate: RELEASE_GATE,
    error: error || null,
  };
}
