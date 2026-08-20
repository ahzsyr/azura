/**
 * Append return-path markers so module pages can show Back to Help.
 */
export function helpHref(href: string, topicId?: string): string {
  try {
    const url = new URL(href, "http://help.local");
    url.searchParams.set("from", "help");
    if (topicId) {
      url.searchParams.set("helpTopic", topicId);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const join = href.includes("?") ? "&" : "?";
    const topic = topicId ? `&helpTopic=${encodeURIComponent(topicId)}` : "";
    return `${href}${join}from=help${topic}`;
  }
}

export function backToHelpHref(helpTopic?: string | null): string {
  if (helpTopic) return `/admin/help#${helpTopic}`;
  return "/admin/help";
}
