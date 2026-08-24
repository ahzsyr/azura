"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "./icon";

type IconDetail = {
  id: string;
  name: string;
  slug: string;
  source: string;
  type: string;
  category?: string | null;
  description?: string | null;
  iconName?: string | null;
  fontFamily?: string | null;
  glyph?: string | null;
  unicode?: string | null;
  media?: { url?: string | null; mimeType?: string | null } | null;
  _count?: { usages: number };
};

type Props = {
  iconId?: string | null;
  onClose?: () => void;
  onDelete?: () => void;
};

export function IconDetailPanel({ iconId, onClose, onDelete }: Props) {
  const [detail, setDetail] = useState<IconDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!iconId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/icons/by-id?iconId=${encodeURIComponent(iconId)}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json: { icon: IconDetail | null }) => {
        if (!cancelled) setDetail(json.icon);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [iconId]);

  if (!iconId) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Select an icon to view details.
      </div>
    );
  }

  const pickSource = (source: string): "builtin" | "custom" | "font" => {
    if (source === "CUSTOM") return "custom";
    if (source === "FONT") return "font";
    return "builtin";
  };

  return (
    <div className="rounded-lg border p-4 space-y-3 sticky top-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium">Icon detail</div>
        {onClose ? (
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/30">
          <Icon iconId={iconId} className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{detail?.name ?? iconId}</p>
          <p className="text-xs font-mono text-muted-foreground truncate">{iconId}</p>
        </div>
      </div>

      {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : null}

      {detail ? (
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Source</dt>
            <dd>
              <Badge variant="secondary">{pickSource(detail.source)}</Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{detail.type}</dd>
          </div>
          {detail.category ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Category</dt>
              <dd>{detail.category}</dd>
            </div>
          ) : null}
          {detail.iconName ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Component</dt>
              <dd className="font-mono">{detail.iconName}</dd>
            </div>
          ) : null}
          {detail.fontFamily ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Font</dt>
              <dd className="truncate">{detail.fontFamily}</dd>
            </div>
          ) : null}
          {detail.glyph ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Glyph</dt>
              <dd>{detail.glyph}</dd>
            </div>
          ) : null}
          {detail.media?.url ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Font file</dt>
              <dd className="truncate max-w-[140px]" title={detail.media.url}>
                {detail.media.mimeType ?? "linked"}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Usages</dt>
            <dd>{detail._count?.usages ?? 0}</dd>
          </div>
        </dl>
      ) : null}

      {onDelete ? (
        <Button type="button" variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          Delete icon
        </Button>
      ) : null}
    </div>
  );
}
