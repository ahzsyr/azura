import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const COMMON_LANGS = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "html",
  "css",
  "bash",
  "python",
  "sql",
  "markdown",
  "yaml",
  "plaintext",
] as const;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [...COMMON_LANGS],
    });
  }
  return highlighterPromise;
}

export type HighlightCodeOptions = {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
};

export async function highlightCode({
  code,
  language,
  showLineNumbers = true,
  highlightLines = [],
}: HighlightCodeOptions): Promise<string> {
  const highlighter = await getHighlighter();
  const lang = COMMON_LANGS.includes(language as (typeof COMMON_LANGS)[number])
    ? language
    : "plaintext";

  let html = highlighter.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
  });

  if (showLineNumbers) {
    html = html.replace(
      /<pre class="shiki/g,
      '<pre class="shiki cb-code-block__pre cb-code-block__pre--lines"'
    );
  }

  if (highlightLines.length > 0) {
    const lineSet = new Set(highlightLines);
    const lines = code.split("\n");
    html = html.replace(/<code>([\s\S]*)<\/code>/, (_match, inner: string) => {
      const parts = inner.split("\n");
      const wrapped = parts
        .map((line: string, i: number) => {
          const n = i + 1;
          if (lineSet.has(n)) {
            return `<span class="cb-code-line cb-code-line--highlight" data-line="${n}">${line || " "}</span>`;
          }
          return `<span class="cb-code-line" data-line="${n}">${line || " "}</span>`;
        })
        .join("\n");
      return `<code>${wrapped}</code>`;
    });
  }

  return html;
}

export const CODE_LANGUAGES = COMMON_LANGS;
