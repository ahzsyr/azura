export function AdminSaveFeedback({
  feedback,
}: {
  feedback: { kind: "ok" | "err"; text: string } | null;
}) {
  if (!feedback) return null;
  return (
    <p
      className={feedback.kind === "ok" ? "apm-save-feedback apm-save-feedback--ok" : "apm-save-feedback apm-save-feedback--err"}
      role="status"
    >
      {feedback.text}
    </p>
  );
}
