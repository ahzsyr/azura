"use client";

import Link from "next/link";
import { Suspense } from "react";
import { DesignHubShell } from "@/components/admin/layout/design-hub-shell";
import { Button } from "@/components/ui/button";
import { WhatsAppAdminPanel } from "@/features/whatsapp/whatsapp-admin-panel";
import type { PublicLocale } from "@/i18n/locale-config";

type Props = {
  resolvedPhone: string;
  enabledLocales: PublicLocale[];
  messageValues: Record<string, Record<string, string>>;
  fileFallbacks: Record<string, string>;
};

function WhatsAppAdminPanelFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl border bg-muted/40" />
      ))}
    </div>
  );
}

export function WhatsAppAdminClient(props: Props) {
  return (
    <DesignHubShell
      title="WhatsApp"
      description="Customize the floating button, in-page inquiry buttons, and translatable message templates."
      actions={
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/company">Company phone</Link>
        </Button>
      }
    >
      <Suspense fallback={<WhatsAppAdminPanelFallback />}>
        <WhatsAppAdminPanel {...props} />
      </Suspense>
    </DesignHubShell>
  );
}
