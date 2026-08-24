"use client";

import { cn } from "@/lib/utils";

export type KnowledgePanelPreviewData = {
  name?: string;
  category?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string | null;
  socialProfiles?: string[];
  foundingDate?: string;
};

type Props = {
  data: KnowledgePanelPreviewData;
  className?: string;
};

export function GoogleKnowledgePanelPreview({ data, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        D. Knowledge panel simulation
      </p>
      <div className="rounded-lg border bg-background p-4 space-y-3 max-w-sm">
        <div className="flex items-center gap-3">
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt="" className="h-10 w-10 rounded object-contain bg-muted" />
          ) : (
            <div className="h-10 w-10 rounded bg-muted" />
          )}
          <div>
            <p className="font-semibold">{data.name ?? "Organization"}</p>
            {data.category ? (
              <p className="text-xs text-muted-foreground">{data.category}</p>
            ) : null}
          </div>
        </div>
        {data.description ? (
          <p className="text-sm text-muted-foreground line-clamp-4">{data.description}</p>
        ) : null}
        <dl className="grid gap-1 text-sm">
          {data.phone ? (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{data.phone}</dd>
            </div>
          ) : null}
          {data.address ? (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd>{data.address}</dd>
            </div>
          ) : null}
          {data.foundingDate ? (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="text-muted-foreground">Founded</dt>
              <dd>{data.foundingDate}</dd>
            </div>
          ) : null}
        </dl>
        {data.socialProfiles?.length ? (
          <p className="text-xs text-muted-foreground">
            Profiles: {data.socialProfiles.length} provided
          </p>
        ) : null}
        <p className="text-xs text-amber-700 dark:text-amber-400 border-t pt-2">
          Simulation — structured data may help Google understand the entity but cannot force a
          Knowledge Panel.
        </p>
      </div>
    </div>
  );
}
