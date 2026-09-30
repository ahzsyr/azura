"use client";

import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";

import Link from "next/link";
import { Handshake } from "lucide-react";
import { useState, useTransition } from "react";
import type { PartnerProgramAdmin } from "@/presets/partner/types";
import { deletePartnerProgram, togglePartnerProgramPublished } from "@/presets/partner/actions";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-content-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PartnerProgramManager({ programs: initialPrograms }: { programs: PartnerProgramAdmin[] }) {
  const [programs] = useState(initialPrograms);
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => window.location.reload());

  return (
    <div>
      <AdminPageHeader
        title="Partners"
        description="Partner programs with categories and listings."
        actions={
          <Button asChild>
            <Link href="/admin/partners/new">Add partner program</Link>
          </Button>
        }
      />
      {programs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Handshake className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 font-medium">No partner programs yet</p>
          <Button asChild className="mt-4">
            <Link href="/admin/partners/new">Add partner program</Link>
          </Button>
        </div>
      ) : (
        <AdminCardGrid columns={3} className={pending ? "opacity-80" : undefined}>
          {programs.map((program) => (
            <div key={program.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex h-28 items-center justify-center bg-muted">
                <Handshake className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{pickLocale(program, 'title', 'en')}</h3>
                    {!program.isPublished && (
                      <Badge variant="secondary" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{program.slug} · {program.categoryCount} categor{program.categoryCount === 1 ? "y" : "ies"} ·{" "}
                    {program.partnerCount} partner{program.partnerCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm">
                    <Link href={`/admin/partners/${program.id}`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await togglePartnerProgramPublished(program.id, !program.isPublished);
                        refresh();
                      })
                    }
                  >
                    {program.isPublished ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete "${pickLocale(program, 'title', 'en')}"?`)) return;
                      startTransition(async () => {
                        await deletePartnerProgram(program.id);
                        refresh();
                      });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </AdminCardGrid>
      )}
    </div>
  );
}
