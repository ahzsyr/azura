/**
 * Reject-only customCss policy for theme packages (M7.3).
 * Detection may CSS-escape-decode scratch copies; stored CSS is never rewritten.
 */
import postcss, { type ChildNode, type Container, type Declaration, type AtRule, type Rule } from "postcss";

export const CUSTOM_CSS_MAX_BYTES = 48 * 1024;

const ALLOWED_URL = /^\/(uploads|assets|images)\/[A-Za-z0-9._/-]*$/;
const FORBIDDEN_SCAN = /expression\s*\(|behavior\s*:|-moz-binding|progid\s*:/i;

export type ThemeCustomCssPolicyResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Decode CSS escapes in a scratch string for matching only.
 * Supports \XXXXXX hex escapes and single-char escapes.
 */
export function decodeCssEscapesForDetection(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    if (i + 1 >= input.length) {
      out += "\\";
      break;
    }
    const next = input[i + 1];
    if (/[0-9a-fA-F]/.test(next)) {
      let hex = "";
      let j = i + 1;
      while (j < input.length && hex.length < 6 && /[0-9a-fA-F]/.test(input[j]!)) {
        hex += input[j];
        j += 1;
      }
      if (j < input.length && input[j] === " ") j += 1;
      out += String.fromCodePoint(parseInt(hex, 16));
      i = j - 1;
      continue;
    }
    if (next === "\n" || next === "\r" || next === "\f") {
      i += 1;
      if (next === "\r" && input[i + 1] === "\n") i += 1;
      continue;
    }
    out += next;
    i += 1;
  }
  return out;
}

function isAllowedUrl(decoded: string): boolean {
  const trimmed = decoded.trim().replace(/^["']|["']$/g, "");
  return ALLOWED_URL.test(trimmed);
}

function walk(node: ChildNode | Container, errors: string[]): void {
  if (node.type === "atrule") {
    const atrule = node as AtRule;
    const decodedName = decodeCssEscapesForDetection(atrule.name).toLowerCase();
    if (decodedName === "import") {
      errors.push("customCss must not use @import");
    }
    if (atrule.params) {
      const decodedParams = decodeCssEscapesForDetection(atrule.params);
      if (/<\/style/i.test(decodedParams)) {
        errors.push("customCss must not contain </style");
      }
      if (FORBIDDEN_SCAN.test(decodedParams)) {
        errors.push("customCss contains forbidden constructs");
      }
      // url() inside at-rule params (e.g. @import url(...))
      for (const match of decodedParams.matchAll(/url\s*\(\s*(["']?)([^)"']+)\1\s*\)/gi)) {
        const inner = match[2] ?? "";
        if (!isAllowedUrl(inner) && decodedName === "import") {
          // already rejected import
        } else if (decodedName !== "import" && !isAllowedUrl(inner)) {
          errors.push(`customCss url() is not an allowed root-relative path: ${inner}`);
        }
      }
    }
  }

  if (node.type === "decl") {
    const decl = node as Declaration;
    const decodedValue = decodeCssEscapesForDetection(decl.value);
    if (/<\/style/i.test(decodedValue)) {
      errors.push("customCss must not contain </style");
    }
    if (FORBIDDEN_SCAN.test(decodedValue)) {
      errors.push("customCss contains forbidden constructs");
    }
    for (const match of decodedValue.matchAll(/url\s*\(\s*(["']?)([^)"']+)\1\s*\)/gi)) {
      const inner = match[2] ?? "";
      if (!isAllowedUrl(decodeCssEscapesForDetection(inner))) {
        errors.push(`customCss url() is not an allowed root-relative path: ${inner}`);
      }
    }
  }

  if (node.type === "rule") {
    const rule = node as Rule;
    const decodedSelector = decodeCssEscapesForDetection(rule.selector);
    if (/<\/style/i.test(decodedSelector)) {
      errors.push("customCss must not contain </style");
    }
  }

  if ("nodes" in node && Array.isArray(node.nodes)) {
    for (const child of node.nodes) walk(child, errors);
  }
}

/**
 * Validate package customCss. On success the original string is unchanged (caller keeps it).
 */
export function validateThemePackageCustomCss(
  css: string | null | undefined,
): ThemeCustomCssPolicyResult {
  if (css === null || css === undefined) return { ok: true };
  if (typeof css !== "string") {
    return { ok: false, errors: ["customCss must be a string or null"] };
  }

  const errors: string[] = [];
  if (Buffer.byteLength(css, "utf8") > CUSTOM_CSS_MAX_BYTES) {
    errors.push(`customCss exceeds ${CUSTOM_CSS_MAX_BYTES} UTF-8 bytes`);
  }

  let root;
  try {
    root = postcss.parse(css, { from: undefined });
  } catch (error) {
    return {
      ok: false,
      errors: [
        `customCss is not valid CSS: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  for (const child of root.nodes ?? []) walk(child, errors);

  // Whole-string defense after detection decode (covers obfuscated @import names
  // that PostCSS may not surface as atrule.name === "import").
  const decodedAll = decodeCssEscapesForDetection(css);
  if (/@\s*import\b/i.test(decodedAll)) {
    errors.push("customCss must not use @import");
  }
  if (/<\/style/i.test(decodedAll)) {
    errors.push("customCss must not contain </style");
  }
  if (FORBIDDEN_SCAN.test(decodedAll)) {
    errors.push("customCss contains forbidden constructs");
  }

  // Deduplicate
  const unique = [...new Set(errors)];
  if (unique.length > 0) return { ok: false, errors: unique };
  return { ok: true };
}
