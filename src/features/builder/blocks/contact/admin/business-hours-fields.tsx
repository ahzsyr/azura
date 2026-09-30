"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  WEEKDAY_LABELS,
  defaultBusinessHours,
  type BusinessHoursDay,
} from "@/features/builder/blocks/contact/schemas/business-hours";

type Props = {
  value: BusinessHoursDay[];
  onChange: (next: BusinessHoursDay[]) => void;
};

export function BusinessHoursFields({ value, onChange }: Props) {
  const days = value.length ? value : defaultBusinessHours();

  const updateDay = (day: BusinessHoursDay["day"], patch: Partial<BusinessHoursDay>) => {
    const next = days.map((row) => (row.day === day ? { ...row, ...patch } : row));
    onChange(next);
  };

  const ensureInitialized = () => {
    if (!value.length) onChange(defaultBusinessHours());
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Business hours</Label>
        {!value.length ? (
          <button
            type="button"
            className="text-xs text-primary underline-offset-2 hover:underline"
            onClick={ensureInitialized}
          >
            Initialize week table
          </button>
        ) : (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onChange(defaultBusinessHours())}
          >
            Reset defaults
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[20rem] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 text-left font-medium">Day</th>
              <th className="w-[7.25rem] px-1.5 py-2 text-center font-medium">Open</th>
              <th className="w-[7.25rem] px-1.5 py-2 text-center font-medium">Close</th>
              <th className="w-14 px-1.5 py-2 text-center font-medium">Closed</th>
            </tr>
          </thead>
          <tbody>
            {days.map((row) => (
              <tr key={row.day} className="border-t">
                <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                  {WEEKDAY_LABELS[row.day]}
                </td>
                <td className="px-1.5 py-1.5 align-middle">
                  <input
                    type="time"
                    value={row.open}
                    disabled={row.closed}
                    onChange={(e) => updateDay(row.day, { open: e.target.value })}
                    className={cn(
                      "h-8 w-full min-w-0 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                  />
                </td>
                <td className="px-1.5 py-1.5 align-middle">
                  <input
                    type="time"
                    value={row.close}
                    disabled={row.closed}
                    onChange={(e) => updateDay(row.day, { close: e.target.value })}
                    className={cn(
                      "h-8 w-full min-w-0 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                  />
                </td>
                <td className="px-1.5 py-1.5 text-center align-middle">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={row.closed}
                    onChange={(e) => updateDay(row.day, { closed: e.target.checked })}
                    aria-label={`${WEEKDAY_LABELS[row.day]} closed`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
