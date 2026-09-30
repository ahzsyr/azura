"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HelpSystemDiagnostics } from "@/features/help/types";
import { withClientDiagnostics } from "@/features/help/lib/system-diagnostics";
import { formatDiagnosticsClipboard } from "@/features/help/lib/diagnostics-clipboard";

export function HelpSystemInfo({ initial }: { initial: HelpSystemDiagnostics }) {
  const { resolvedTheme } = useTheme();
  const [diagnostics, setDiagnostics] = useState(initial);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDiagnostics(
      withClientDiagnostics(initial, {
        theme: resolvedTheme ?? null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    );
  }, [initial, resolvedTheme]);

  const groups = useMemo(
    () => [
      {
        title: "Application",
        rows: [
          ["Version", diagnostics.applicationVersion],
          ["Help content", String(diagnostics.helpContentVersion)],
          ["Build date", diagnostics.buildDate ?? "—"],
        ],
      },
      {
        title: "Deployment",
        rows: [
          ["Profile", `${diagnostics.deploymentProfileLabel} (${diagnostics.deploymentProfileId})`],
          ["Environment", diagnostics.environment],
          ["Modules", diagnostics.enabledModules.join(", ") || "—"],
        ],
      },
      {
        title: "Runtime",
        rows: [
          ["Languages", diagnostics.enabledLanguages.join(", ") || "—"],
          ["Default language", diagnostics.defaultLanguage ?? "—"],
          ["Theme", diagnostics.currentTheme ?? "—"],
          ["Timezone", diagnostics.currentTimezone ?? "—"],
          ["Search", diagnostics.searchEngine],
        ],
      },
    ],
    [diagnostics]
  );

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(formatDiagnosticsClipboard(diagnostics));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">System Diagnostics</h2>
          <p className="text-sm text-muted-foreground">
            Read-only support snapshot (no secrets).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={copyAll} className="gap-1.5">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy diagnostics"}
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {groups.map((group) => (
          <div key={group.title} className="rounded-xl border p-4">
            <h3 className="mb-3 text-sm font-medium">{group.title}</h3>
            <dl className="space-y-2">
              {group.rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="break-words text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
