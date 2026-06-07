"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  target: string;
  label?: string;
  className?: string;
};

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number };

function calcTimeLeft(target: string): TimeLeft | null {
  const end = new Date(target).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-white/10 px-3 py-2 min-w-[3.5rem]">
      <span className="text-2xl font-bold tabular-nums">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-75">{label}</span>
    </div>
  );
}

export function CountdownTimer({ target, label, className }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calcTimeLeft(target));

  useEffect(() => {
    if (!target) return;
    const id = window.setInterval(() => setTimeLeft(calcTimeLeft(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!target || !timeLeft) return null;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {label && <p className="text-sm font-medium opacity-90">{label}</p>}
      <div className="flex gap-2">
        <Unit value={timeLeft.days} label="Days" />
        <Unit value={timeLeft.hours} label="Hrs" />
        <Unit value={timeLeft.minutes} label="Min" />
        <Unit value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  );
}
