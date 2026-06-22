"use client";

import { cn } from "@/lib/utils";

type Props = {
  type: "bar" | "donut";
  data: number[];
  className?: string;
};

export function MiniStatChart({ type, data, className }: Props) {
  if (!data.length) return null;

  if (type === "donut") {
    const total = data.reduce((a, b) => a + b, 0) || 1;
    let offset = 0;
    const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "#94a3b8"];
    const segments = data.map((v, i) => {
      const pct = (v / total) * 100;
      const seg = { pct, offset, color: colors[i % colors.length] };
      offset += pct;
      return seg;
    });

    return (
      <svg viewBox="0 0 36 36" className={cn("h-10 w-10", className)} aria-hidden>
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke={seg.color}
            strokeWidth="3.2"
            strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
            strokeDashoffset={25 - seg.offset}
          />
        ))}
      </svg>
    );
  }

  const max = Math.max(...data, 1);
  return (
    <div className={cn("flex h-8 items-end gap-0.5", className)} aria-hidden>
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-t bg-primary/70"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}
