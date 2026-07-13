"use client";

import { compositionPresetsRegistry } from "@/features/layout-engine/composition-presets-registry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  onApplyPreset: (presetId: string) => void;
};

export function CompositionPresetsPanel({ onApplyPreset }: Props) {
  const presets = compositionPresetsRegistry.list();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Starter Content</CardTitle>
        <CardDescription>
          Optional starter content sets that insert blocks into a region without changing the layout.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {presets.map((preset) => (
          <div key={preset.id} className="rounded-lg border p-4">
            <div className="font-medium">{preset.name}</div>
            {preset.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{preset.description}</p>
            ) : null}
            <Button className="mt-3" variant="outline" size="sm" type="button" onClick={() => onApplyPreset(preset.id)}>
              Insert
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
