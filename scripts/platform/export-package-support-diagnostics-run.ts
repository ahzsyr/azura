/**
 * CLI runner for export-package-support-diagnostics.mjs (loaded via tsx).
 */
import {
  assertSupportDiagnosticsShape,
  collectSupportDiagnostics,
} from "../../src/platform/packages/package-support-diagnostics";

async function main() {
  const args = process.argv.slice(2);
  const packageIds: string[] = [];
  let allBuiltins = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all-builtins") {
      allBuiltins = true;
      continue;
    }
    if (arg === "--package") {
      const id = args[++i];
      if (!id) throw new Error("--package requires an id");
      packageIds.push(id);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: --all-builtins | --package <id> [--package <id> ...]",
      );
      return;
    }
  }

  const snapshot = await collectSupportDiagnostics({
    packageIds: packageIds.length ? packageIds : undefined,
    allBuiltins,
  });
  assertSupportDiagnosticsShape(snapshot);
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

main().catch((error) => {
  console.error(
    "[export-package-support-diagnostics]",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
