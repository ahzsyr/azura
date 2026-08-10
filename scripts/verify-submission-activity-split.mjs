import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

const require = createRequire(import.meta.url);
// Load the server-safe builder via tsx/ts-node isn't available; use dynamic compile via next isn't needed —
// verify source imports + execute by spawning tsx if present, else use a tiny inline duplicate check.

const logPath = path.join(process.cwd(), "debug-7ebaed.log");
function log(payload) {
  fs.appendFileSync(
    logPath,
    `${JSON.stringify({ sessionId: "7ebaed", runId: "post-fix", timestamp: Date.now(), ...payload })}\n`,
  );
}

const pageSrc = fs.readFileSync(
  path.join(process.cwd(), "src/app/admin/(dashboard)/form-submissions/[id]/page.tsx"),
  "utf8",
);
const streamSrc = fs.readFileSync(
  path.join(process.cwd(), "src/features/forms/admin/submission-activity-stream.tsx"),
  "utf8",
);
const activitySrc = fs.readFileSync(
  path.join(process.cwd(), "src/features/forms/admin/submission-activity.ts"),
  "utf8",
);

const pageImportsBuilderFromClient = /buildSubmissionActivityItems[\s\S]*from\s+"@\/features\/forms\/admin\/submission-activity-stream"/.test(
  pageSrc,
);
const pageImportsBuilderFromShared = pageSrc.includes(
  'from "@/features/forms/admin/submission-activity"',
);
const streamIsClient = streamSrc.trimStart().startsWith('"use client"');
const sharedHasBuilder = activitySrc.includes("export function buildSubmissionActivityItems");
const streamStillExportsBuilder = /export\s*\{[^}]*buildSubmissionActivityItems/.test(streamSrc);

log({
  hypothesisId: "F",
  location: "scripts/verify-submission-activity-split.mjs",
  message: "post-fix import graph check",
  data: {
    pageImportsBuilderFromClient,
    pageImportsBuilderFromShared,
    streamIsClient,
    sharedHasBuilder,
    streamStillExportsBuilder,
  },
});

if (pageImportsBuilderFromClient || streamStillExportsBuilder || !pageImportsBuilderFromShared || !sharedHasBuilder) {
  console.error("VERIFY FAILED", {
    pageImportsBuilderFromClient,
    pageImportsBuilderFromShared,
    sharedHasBuilder,
    streamStillExportsBuilder,
  });
  process.exit(1);
}

// Execute builder via npx tsx
const { spawnSync } = await import("child_process");
const run = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "-e",
    `
import { buildSubmissionActivityItems } from "./src/features/forms/admin/submission-activity.ts";
const items = buildSubmissionActivityItems({
  createdAt: new Date("2024-01-01"),
  score: 10,
  status: "NEW",
  events: [],
  webhooks: [],
});
console.log(JSON.stringify({ ok: true, count: items.length, titles: items.map(i => i.title) }));
`,
  ],
  { encoding: "utf8", cwd: process.cwd() },
);

if (run.status !== 0) {
  log({
    hypothesisId: "F",
    location: "scripts/verify-submission-activity-split.mjs",
    message: "builder execution failed",
    data: { stderr: run.stderr?.slice(0, 500), status: run.status },
  });
  console.error(run.stderr || run.stdout);
  process.exit(1);
}

const out = JSON.parse(run.stdout.trim().split("\n").pop());
log({
  hypothesisId: "F",
  location: "scripts/verify-submission-activity-split.mjs",
  message: "builder executes on server-side without client proxy",
  data: out,
});
console.log("VERIFY OK", out);
