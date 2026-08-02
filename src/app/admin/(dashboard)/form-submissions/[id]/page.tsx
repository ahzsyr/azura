import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getFormSubmission,
  updateFormSubmissionStatus,
} from "@/features/forms/form-submission.service";
import { getInteractionEventsForAggregate } from "@/features/forms/interaction-event.service";
import { SubmissionActivityStream } from "@/features/forms/admin/submission-activity-stream";
import { buildSubmissionActivityItems } from "@/features/forms/admin/submission-activity";
import { SubmissionAutomationPanel } from "@/features/forms/admin/submission-automation-panel";
import { SubmissionDetailClient } from "@/features/forms/admin/submission-detail-client";
import { SubmissionPayloadView } from "@/features/forms/admin/submission-payload-view";
import { SubmissionStatusBadge } from "@/features/forms/admin/submission-status-badge";
import { extractSubmissionContact, formatSubmissionReference } from "@/features/forms/lib/submission-contact";
import type { FormTemplateDefinition } from "@/features/forms/types";
import { revalidatePath } from "next/cache";

type Props = { params: Promise<{ id: string }> };

function MetadataField({
  label,
  value,
  linked,
}: {
  label: string;
  value?: string | null;
  linked?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">
        {value ? (
          linked ? (
            <Badge variant="secondary" className="font-normal">
              {value}
            </Badge>
          ) : (
            <span className="text-foreground break-all">{value}</span>
          )
        ) : (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Not linked
          </Badge>
        )}
      </dd>
    </div>
  );
}

export default async function FormSubmissionDetailPage({ params }: Props) {
  const { id } = await params;

  let submission = null;
  let events: Awaited<ReturnType<typeof getInteractionEventsForAggregate>> = [];
  try {
    submission = await getFormSubmission(id);
    if (submission) events = await getInteractionEventsForAggregate(id);
  } catch {
    // DB not connected
  }
  if (!submission) notFound();

  // Opening a message marks it read (inbox unread = NEW).
  if (submission.status === "NEW") {
    try {
      await updateFormSubmissionStatus(id, "REVIEWED");
      submission = { ...submission, status: "REVIEWED" };
      revalidatePath("/admin/form-submissions");
    } catch {
      // non-fatal
    }
  }

  const activity = buildSubmissionActivityItems({
    createdAt: submission.createdAt,
    score: submission.score,
    status: submission.status,
    assigneeId: submission.assigneeId,
    pipelineType: submission.pipelineType,
    metadata: (submission.metadata ?? {}) as Record<string, unknown>,
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      metadata: e.metadata,
      timestamp: e.timestamp,
    })),
    webhooks: submission.webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      status: w.status,
      responseCode: w.responseCode,
      createdAt: w.createdAt,
    })),
  });

  const meta = (submission.metadata ?? {}) as Record<string, unknown>;
  const pastReplies = Array.isArray(meta.replies)
    ? (meta.replies as Array<Record<string, string>>)
    : [];
  const contact = extractSubmissionContact(submission.payload);
  const definition = (submission.template?.definition ?? null) as FormTemplateDefinition | null;
  const accountId = definition?.notifications?.accountId;
  let accountName: string | null = null;
  if (accountId) {
    try {
      const { getEmailAccountRecord } = await import("@/features/email/email-accounts.service");
      const account = await getEmailAccountRecord(accountId);
      accountName = account?.name ?? null;
    } catch {
      accountName = null;
    }
  }

  const templateName = submission.template?.name ?? "Form";
  const defaultForwardSubject = `Fwd: ${templateName}${contact.name ? ` — ${contact.name}` : ""}`;
  const defaultForwardBody = [
    "Please see the forwarded form submission below.",
    "",
    contact.name ? `From: ${contact.name}` : null,
    contact.email ? `Email: ${contact.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <SubmissionDetailClient
      title={contact.name || contact.email || "Submission"}
      description={templateName}
      submissionId={submission.id}
      visitorEmail={contact.email}
      visitorName={contact.name}
      templateName={templateName}
      isArchived={submission.status === "ARCHIVED"}
      defaultForwardSubject={defaultForwardSubject}
      defaultForwardBody={defaultForwardBody}
      pastReplies={pastReplies}
      mainColumn={
        <Card className="p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">
              {formatSubmissionReference(submission.id)}
            </Badge>
            <SubmissionStatusBadge status={submission.status} />
            <Badge variant="outline">Score: {submission.score}</Badge>
            {submission.blockType && <Badge variant="secondary">{submission.blockType}</Badge>}
            {contact.email && (
              <Badge variant="outline" className="font-normal">
                {contact.email}
              </Badge>
            )}
          </div>
          <div>
            <h2 className="text-sm font-medium mb-2">Submission Details</h2>
            <SubmissionPayloadView
              payload={submission.payload}
              fields={definition?.fields}
              steps={definition?.steps}
            />
          </div>
        </Card>
      }
      sidebar={
        <>
          <SubmissionAutomationPanel definition={definition} accountName={accountName} />

          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Metadata</h3>
            <dl className="space-y-3">
              <MetadataField label="Customer" value={submission.customerId} />
              <MetadataField label="Company" value={submission.companyId} />
              <MetadataField label="Campaign" value={submission.campaignId} linked />
              <MetadataField label="Pipeline" value={submission.pipelineType} linked />
              <div className="space-y-1">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Locale
                </dt>
                <dd>
                  <Badge variant="secondary">{submission.locale.toUpperCase()}</Badge>
                </dd>
              </div>
            </dl>
          </Card>

          <SubmissionActivityStream items={activity} maxHeightClassName="max-h-[450px]" />
        </>
      }
    />
  );
}
