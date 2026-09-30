"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { forwardFormSubmissionAction } from "@/features/forms/actions";

export function ForwardModal({
  open,
  onOpenChange,
  submissionId,
  defaultSubject,
  defaultBody,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string;
  defaultSubject: string;
  defaultBody: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [includeOriginal, setIncludeOriginal] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTo("");
    setCc("");
    setBcc("");
    setSubject(defaultSubject);
    setBody(defaultBody);
    setIncludeOriginal(true);
    setMessage(null);
  }, [open, defaultSubject, defaultBody]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const send = () => {
    if (!to.trim()) {
      setMessage({ ok: false, text: "At least one recipient is required." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await forwardFormSubmissionAction({
        submissionId,
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject,
        body,
        includeOriginal,
      });
      if (!res.success) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      setToast(`Forwarded to ${res.data?.to ?? to}`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Forward</DialogTitle>
            <DialogDescription>
              Send this submission to one or more recipients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs" htmlFor="forward-to">
                To
              </Label>
              <Input
                id="forward-to"
                className="mt-1"
                placeholder="recipient@company.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs" htmlFor="forward-cc">
                  CC
                </Label>
                <Input
                  id="forward-cc"
                  className="mt-1"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs" htmlFor="forward-bcc">
                  BCC
                </Label>
                <Input
                  id="forward-bcc"
                  className="mt-1"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs" htmlFor="forward-subject">
                Subject
              </Label>
              <Input
                id="forward-subject"
                className="mt-1"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="forward-body">
                Message
              </Label>
              <Textarea
                id="forward-body"
                className="mt-1 min-h-28"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeOriginal}
                onChange={(e) => setIncludeOriginal(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              Include original submission
            </label>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" disabled={pending || !to.trim()} onClick={send}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Forward"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 end-4 z-[60] rounded-lg border bg-background px-4 py-2 text-sm shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
