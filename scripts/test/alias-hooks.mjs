// Test-only resolve hook: maps the "@/" alias to src/ so Node's native test
// runner + type stripping can load the auth tests without spawning a worker.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const srcRoot = path.join(process.cwd(), "src");

function withExtension(target) {
  if (existsSync(target)) return target;
  for (const candidate of [`${target}.ts`, `${target}.tsx`, path.join(target, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return target;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        url: pathToFileURL(withExtension(path.join(srcRoot, specifier.slice(2)))).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
