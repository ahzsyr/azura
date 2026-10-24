"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { userContactHrefs } from "@/features/account/admin/user-portal-access";
import { logUserContactAction, sendUserEmailAction } from "@/features/account/admin/user-portal.actions";

type Props = {
  userId: string;
  email: string;
  phone: string | null;
};

export function UserContactActions({ userId, email, phone }: Props) {
  const links = userContactHrefs(phone);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mailto, setMailto] = useState<string | null>(null);

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setMailto(null);
    const result = await sendUserEmailAction({ userId, subject, message });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      if (result.mailto) {
        const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        setMailto(href);
      }
      return;
    }
    setNotice("Email sent.");
    setSubject("");
    setMessage("");
    setOpen(false);
  }

  function openChannel(channel: "whatsapp" | "phone", href: string) {
    void logUserContactAction({ userId, channel });
    window.open(href, channel === "phone" ? "_self" : "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
          Email
        </Button>
        {links.whatsapp ? (
          <Button type="button" size="sm" variant="outline" onClick={() => openChannel("whatsapp", links.whatsapp!)}>
            WhatsApp
          </Button>
        ) : null}
        {links.tel ? (
          <Button type="button" size="sm" variant="outline" onClick={() => openChannel("phone", links.tel!)}>
            Call
          </Button>
        ) : null}
      </div>
      {open ? (
        <form onSubmit={sendEmail} className="w-full max-w-md space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`subject-${userId}`}>Subject</Label>
            <Input id={`subject-${userId}`} value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`message-${userId}`}>Message</Label>
            <Textarea
              id={`message-${userId}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
            />
          </div>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Sending…" : "Send email"}
          </Button>
        </form>
      ) : null}
      {notice ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {mailto ? (
        <a href={mailto} className="text-primary text-sm underline">
          Open in your email app
        </a>
      ) : null}
    </div>
  );
}
