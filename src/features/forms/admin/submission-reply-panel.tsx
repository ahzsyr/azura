"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { replyToFormSubmissionAction } from "@/features/forms/actions";

type PastReply = {
  to?: string;
  subject?: string;
  body?: string;
  sentAt?: string;
};

export type SubmissionReplyPanelHandle = {
  open: () => void;
};

type SubmissionReplyPanelProps = {
  submissionId: string;
  visitorEmail: string | null;
  visitorName: string | null;
  templateName: string;
  pastReplies?: PastReply[];
};

export const SubmissionReplyPanel = forwardRef<
  SubmissionReplyPanelHandle,
  SubmissionReplyPanelProps
>(function SubmissionReplyPanel(
  {
    submissionId,
    visitorEmail,
    visitorName,
    templateName,
    pastReplies = [],
  },
  ref,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [replyOpen, setReplyOpen] = useState(false);
  const [subject, setSubject] = useState(`Re: ${templateName}`);
  const [body, setBody] = useState(
    visitorName ? `Hi ${visitorName},\n\n` : "Hi,\n\n",
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: () => {
      if (!visitorEmail) return;
      setMessage(null);
      setReplyOpen(true);
    },
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#reply" && visitorEmail) {
      setReplyOpen(true);
    }
  }, [visitorEmail]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const send = () => {
    if (!visitorEmail) return;
    setMessage(null);
    startTransition(async () => {
      const res = await replyToFormSubmissionAction({
        submissionId,
        subject,
        body,
        markReviewed: true,
      });
      if (!res.success) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      setToast(`Reply sent to ${res.data?.to ?? visitorEmail}.`);
      setBody(visitorName ? `Hi ${visitorName},\n\n` : "Hi,\n\n");
      setReplyOpen(false);
      router.refresh();
    });
  };

  return (
    <div id="reply" className="scroll-mt-4">
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reply</DialogTitle>
            <DialogDescription>
              To: {visitorEmail}
              {visitorName ? ` (${visitorName})` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs" htmlFor="reply-subject">
                Subject
              </Label>
              <Input
                id="reply-subject"
                className="mt-1"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="reply-body">
                Message
              </Label>
              <Textarea
                id="reply-body"
                className="mt-1 min-h-36"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            {message && (
              <p
                className={`text-xs ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
                role="alert"
              >
                {message.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReplyOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" disabled={pending || !body.trim() || !visitorEmail} onClick={send}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send Reply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pastReplies.length > 0 && (
        <Card className="mt-4 p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Previous replies
          </p>
          {pastReplies.map((r, i) => (
            <div key={i} className="rounded-lg border bg-muted/30 p-2 text-xs space-y-1">
              <p className="font-medium">{r.subject ?? "(no subject)"}</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{r.body}</p>
              {r.sentAt && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(r.sentAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </Card>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 end-4 z-[60] rounded-lg border bg-background px-4 py-2 text-sm shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
});
