/**
 * CLI-only resolve hook: stub `server-only` so Node/tsx scripts can import
 * server modules (Prisma, seed, etc.) outside Next Server Components.
 *
 * Does not stub Prisma or other app infrastructure — live CLIs keep real deps.
 *
 * Usage: node --import ./scripts/platform/register-cli-server-only.mjs …
 *        tsx --import ./scripts/platform/register-cli-server-only.mjs …
 */
import { registerHooks } from "node:module";

const stubUrl = new URL("./stubs/server-only.mjs", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: stubUrl, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
