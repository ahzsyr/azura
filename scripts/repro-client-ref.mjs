import fs from "fs";
import path from "path";

/**
 * Mirrors Next/Turbopack EcmascriptClientReferenceModule proxy generated for
 * any export from a "use client" file when imported into a Server Component.
 * See .next/dev/server/chunks/ssr for identical throw messages.
 */
function registerClientReference(impl, _id, _name) {
  return impl;
}

const buildSubmissionActivityItems = registerClientReference(
  function () {
    throw new Error(
      "Attempted to call buildSubmissionActivityItems() from the server but buildSubmissionActivityItems is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.",
    );
  },
  "[project]/src/features/forms/admin/submission-activity-stream.tsx",
  "buildSubmissionActivityItems",
);

const logPath = path.join(process.cwd(), "debug-7ebaed.log");
function log(payload) {
  fs.appendFileSync(
    logPath,
    `${JSON.stringify({ sessionId: "7ebaed", runId: "pre-fix", timestamp: Date.now(), ...payload })}\n`,
  );
}

const pageImportsFromClient =
  fs
    .readFileSync(
      path.join(process.cwd(), "src/app/admin/(dashboard)/form-submissions/[id]/page.tsx"),
      "utf8",
    )
    .includes('from "@/features/forms/admin/submission-activity-stream"') &&
  fs
    .readFileSync(
      path.join(process.cwd(), "src/features/forms/admin/submission-activity-stream.tsx"),
      "utf8",
    )
    .startsWith('"use client"');

log({
  hypothesisId: "F",
  location: "scripts/repro-client-ref.mjs",
  message: "static evidence: server page imports+calls helper from use client module",
  data: { pageImportsFromClient },
});

try {
  buildSubmissionActivityItems({
    createdAt: new Date(),
    score: 1,
    status: "NEW",
    events: [],
    webhooks: [],
  });
  log({ hypothesisId: "F", location: "scripts/repro-client-ref.mjs", message: "UNEXPECTED success" });
} catch (e) {
  log({
    hypothesisId: "F",
    location: "scripts/repro-client-ref.mjs",
    message: "client reference call threw (matches production RSC failure mode)",
    data: {
      error: e instanceof Error ? e.message : String(e),
      name: e instanceof Error ? e.name : null,
      pageImportsFromClient,
    },
  });
  console.log("THREW:", e instanceof Error ? e.message.slice(0, 220) : e);
  console.log("pageImportsFromClient:", pageImportsFromClient);
}
