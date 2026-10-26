/**
 * Test double for `@/features/email/react-templates`: renders the same pieces
 * the real templates render (heading, code, paragraphs, link) as plain HTML and
 * text, without React or the JSX transform.
 */
export function renderTransactionalEmail({ preview, heading, paragraphs = [], code, linkUrl, linkLabel }) {
  const html = [
    `<h2>${escapeHtml(heading)}</h2>`,
    code ? `<p><strong>${escapeHtml(code)}</strong></p>` : "",
    ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`),
    linkUrl ? `<a href="${escapeHtml(linkUrl)}">${escapeHtml(linkLabel ?? linkUrl)}</a>` : "",
  ].join("");
  const text = [
    heading,
    code ? `Code: ${code}` : "",
    ...paragraphs,
    linkUrl ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { preview, html, text };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
