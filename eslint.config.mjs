import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const templateBoundaryMessage =
  "Fitness Test 4: templates must consume ViewModels only — use resolvers/, not storage.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/templates/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/lib/prisma", message: templateBoundaryMessage },
            { name: "@prisma/client", message: templateBoundaryMessage },
            {
              name: "@/features/products/products-data.service",
              message: templateBoundaryMessage,
            },
            {
              name: "@/features/content/content-data.service",
              message: templateBoundaryMessage,
            },
            {
              name: "@/features/content/content-public.service",
              message: templateBoundaryMessage,
            },
          ],
          patterns: [
            {
              group: ["**/*repository*", "**/*.repository"],
              message: templateBoundaryMessage,
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
