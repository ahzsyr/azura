const ENABLE_URL_RE = /https:\/\/console\.developers\.google\.com\/apis\/api\/[^\s"]+/;
const PROJECT_ID_RE = /project (\d+)/;

export type GoogleApiErrorContext = {
  apiLabel: string;
  extraHint?: string;
  serviceAccountEmail?: string;
};

export function formatGoogleApiError(
  status: number,
  body: string,
  context: GoogleApiErrorContext,
): string {
  let message = body;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) message = parsed.error.message;
  } catch {
    // keep raw body
  }

  const enableUrl = message.match(ENABLE_URL_RE)?.[0];
  const projectId = message.match(PROJECT_ID_RE)?.[1];

  if (status === 403 && enableUrl) {
    const parts = [
      `${context.apiLabel} is not enabled for Google Cloud project ${projectId ?? "your service account project"}.`,
      `Enable it in Google Cloud Console: ${enableUrl}`,
    ];
    if (context.extraHint) parts.push(context.extraHint);
    return parts.join(" ");
  }

  if (status === 403 && /ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient.*scope/i.test(message)) {
    const parts = [`${context.apiLabel} failed (${status}): insufficient OAuth scopes.`];
    if (context.extraHint) parts.push(context.extraHint);
    return parts.join(" ");
  }

  if (
    status === 403 &&
    /verify the URL ownership|URL ownership|Permission denied/i.test(message)
  ) {
    const parts = [
      `${context.apiLabel} failed (${status}): Google could not verify ownership of the submitted URL.`,
    ];
    if (context.serviceAccountEmail) {
      parts.push(
        `In Search Console → Settings → Users and permissions, add ${context.serviceAccountEmail} as Owner on the property that includes this URL (for example https://example.com/ or sc-domain:example.com).`,
      );
    } else if (context.extraHint) {
      parts.push(context.extraHint);
    }
    parts.push(
      "Also confirm Web Search Indexing API is enabled in the same Google Cloud project as the service account JSON key.",
    );
    return parts.join(" ");
  }

  const trimmed = message.slice(0, 400) || "Unknown error";
  return `${context.apiLabel} failed (${status}): ${trimmed}${context.extraHint ? ` ${context.extraHint}` : ""}`;
}
