export const MERGE_TAGS = [
  { key: "firstName", label: "First Name", token: "{{firstName}}" },
  { key: "name", label: "Name", token: "{{name}}" },
  { key: "email", label: "Email", token: "{{email}}" },
  { key: "phone", label: "Phone", token: "{{phone}}" },
  { key: "company", label: "Company", token: "{{company}}" },
  { key: "campaign", label: "Campaign", token: "{{campaign}}" },
  { key: "utmSource", label: "UTM Source", token: "{{utmSource}}" },
  { key: "submissionUrl", label: "Submission URL", token: "{{submissionUrl}}" },
  { key: "score", label: "Score", token: "{{score}}" },
  { key: "assignee", label: "Assignee", token: "{{assignee}}" },
] as const;

export function interpolateMergeTags(
  template: string,
  values: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = values[key];
    return v == null ? "" : String(v);
  });
}
