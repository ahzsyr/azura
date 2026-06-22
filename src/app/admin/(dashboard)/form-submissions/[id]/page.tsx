import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFormSubmission } from "@/features/forms/form-submission.service";

type Props = { params: Promise<{ id: string }> };

export default async function FormSubmissionDetailPage({ params }: Props) {
  const { id } = await params;
  let submission = null;
  try {
    submission = await getFormSubmission(id);
  } catch {
    // DB not connected
  }
  if (!submission) notFound();

  return (
    <>
      <AdminPageHeader
        title="Submission detail"
        description={submission.template?.name ?? submission.id}
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/form-submissions">Back to inbox</Link>
          </Button>
        }
      />
      <Card className="p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Badge>{submission.status}</Badge>
          <Badge variant="outline">Score: {submission.score}</Badge>
          {submission.blockType && <Badge variant="secondary">{submission.blockType}</Badge>}
        </div>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">
          {JSON.stringify(submission.payload, null, 2)}
        </pre>
        {submission.webhooks.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-2">Webhook deliveries</h3>
            <ul className="text-sm space-y-1">
              {submission.webhooks.map((w) => (
                <li key={w.id}>
                  {w.url} — {w.status} {w.responseCode ? `(${w.responseCode})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </>
  );
}
