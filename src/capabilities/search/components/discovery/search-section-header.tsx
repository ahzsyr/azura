"use client";

type Props = {
  label: string;
  count: number;
};

export function SearchSectionHeader({ label, count }: Props) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-border/40 pb-2">
      <h2 className="text-sm font-semibold">{label}</h2>
      <span className="text-xs text-muted-foreground">{count}</span>
    </div>
  );
}
