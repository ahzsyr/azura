/**
 * Resolve hooks used by `node scripts/test/run-auth-tests.mjs`.
 *
 * tsx/esbuild cannot be used in every environment (esbuild spawns a service
 * process), so the auth suites run under Node's built-in TypeScript stripping
 * with these hooks, which mirror tsconfig and swap infrastructure for in-memory
 * doubles:
 *   - "@/*"  → src/*
 *   - extensionless relative imports → .ts/.tsx
 *   - "server-only" → a no-op stub
 *   - "@/lib/prisma" → an in-memory fake (stubs/prisma.mjs)
 *   - the JSON store → an in-memory store
 *   - email delivery and templates → recording / plain-text doubles
 *   - next/server → a small response stub
 *
 * Usage: node --experimental-strip-types --import ./scripts/test/register.mjs \
 *          <test file>
 */
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const stub = (name) => new URL(`./stubs/${name}`, import.meta.url).href;

const EXACT = {
  "server-only": stub("server-only.mjs"),
  "@/lib/prisma": stub("prisma.mjs"),
  "@/features/storage/json-store.service": stub("json-store.mjs"),
  // Deterministic, work-free stand-ins for side-effecting infrastructure.
  bcryptjs: stub("bcryptjs.mjs"),
  "@/lib/rate-limit": stub("rate-limit.mjs"),
  "@/features/seo/integrations/secret-seal.server": stub("secret-seal.mjs"),
  "@/features/email/email.service": stub("email-service.mjs"),
  "@/features/email/react-templates": stub("react-templates.mjs"),
  // next-auth's env module imports next/server; auth errors are all we need.
  "next/server": stub("next-server.mjs"),
};

function findFile(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.mjs`,
    `${base}.js`,
    `${base}.json`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  // Bundler resolution: "./x.js" on disk may be "./x.ts".
  for (const from of [".js", ".mjs"]) {
    if (base.endsWith(from)) {
      for (const to of [".ts", ".tsx"]) {
        const swapped = base.slice(0, -from.length) + to;
        if (existsSync(swapped) && statSync(swapped).isFile()) return swapped;
      }
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const exact = EXACT[specifier];
    if (exact) return { url: exact, shortCircuit: true };

    let base = null;
    if (specifier.startsWith("@/")) {
      base = path.join(root, "src", specifier.slice(2));
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:")
    ) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (base) {
      const found = findFile(base);
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }

    // Bare package subpaths without an extension (e.g. "next/server").
    if (
      !specifier.startsWith(".") &&
      !specifier.startsWith("/") &&
      !specifier.startsWith("node:") &&
      !specifier.startsWith("@/") &&
      context.parentURL
    ) {
      const parts = specifier.split("/");
      const scoped = specifier.startsWith("@");
      const pkgName = scoped ? parts.slice(0, 2).join("/") : parts[0];
      const subPath = parts.slice(scoped ? 2 : 1).join("/");
      if (subPath) {
        const pkgDir = path.join(root, "node_modules", pkgName);
        if (existsSync(pkgDir)) {
          const found = findFile(path.join(pkgDir, subPath));
          if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
        }
      }
    }

    return nextResolve(specifier, context);
  },
});
