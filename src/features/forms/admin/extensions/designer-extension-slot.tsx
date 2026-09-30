"use client";

import { listDesignerExtensions, type DesignerTabId } from "./registry";

/** Renders registered designer extensions for a tab as stacked panels. */
export function DesignerExtensionSlot({
  tab,
  fallback,
}: {
  tab: DesignerTabId;
  fallback?: React.ReactNode;
}) {
  const extensions = listDesignerExtensions(tab);
  if (extensions.length === 0) return <>{fallback ?? null}</>;
  return (
    <div className="space-y-4">
      {extensions.map((ext) => (
        <div key={ext.id} data-extension={ext.id}>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {ext.label}
          </h3>
          {ext.render()}
        </div>
      ))}
    </div>
  );
}
