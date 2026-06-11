#!/usr/bin/env node
/** Shared Prisma CLI runner for deploy scripts. */
import { spawnSync } from "node:child_process";

export function runPrismaOrExit(args, { env = process.env, cwd = process.cwd() } = {}) {
  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a14bff'},body:JSON.stringify({sessionId:'a14bff',runId:'build-fail-debug',hypothesisId:'A',location:'scripts/deploy/run-prisma.mjs:6',message:'runPrismaOrExit spawn start',data:{args,cwd,node:process.version,hasDatabaseUrl:Boolean(env.DATABASE_URL)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const result = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    shell: false,
    env,
    cwd,
  });
  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a14bff'},body:JSON.stringify({sessionId:'a14bff',runId:'build-fail-debug',hypothesisId:'A',location:'scripts/deploy/run-prisma.mjs:13',message:'runPrismaOrExit spawn finished',data:{status:result.status,signal:result.signal,error:result.error?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}
