"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockInput } from "@/features/builder/block-translation-context";
import {
  ContactAdminTabs,
  SelectField,
  makeContactSetProp,
} from "@/features/builder/blocks/contact/admin/shared-contact-fields";
import type { MapProvider } from "@/features/builder/blocks/contact/schemas/map";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function readProvider(props: Record<string, unknown>): MapProvider {
  const raw = props.provider as Partial<MapProvider> | undefined;
  if (raw && typeof raw === "object" && "type" in raw) {
    if (raw.type === "custom") {
      return { type: "custom", embedUrl: raw.embedUrl ?? "" };
    }
    if (raw.type === "openstreetmap") {
      return {
        type: "openstreetmap",
        embedUrl: raw.embedUrl ?? "",
        zoom: typeof raw.zoom === "number" ? raw.zoom : 14,
      };
    }
    if (raw.type === "bing") {
      return {
        type: "bing",
        embedUrl: raw.embedUrl ?? "",
        zoom: typeof raw.zoom === "number" ? raw.zoom : 14,
      };
    }
    return {
      type: "google",
      embedUrl: (raw as { embedUrl?: string }).embedUrl ?? "",
      zoom: typeof (raw as { zoom?: number }).zoom === "number" ? (raw as { zoom: number }).zoom : 14,
    };
  }
  return { type: "google", embedUrl: "", zoom: 14 };
}

export function ContactMapBlockFields({ block, onChange }: Props) {
  const setProp = makeContactSetProp(block, onChange);
  const provider = readProvider(block.props as Record<string, unknown>);

  const updateProvider = (next: MapProvider) => setProp("provider", next);

  return (
    <ContactAdminTabs
      block={block}
      onChange={onChange}
      content={
        <>
          <SelectField
            label="Map provider"
            value={provider.type}
            onChange={(type) => {
              if (type === "custom") {
                updateProvider({ type: "custom", embedUrl: provider.embedUrl });
              } else if (type === "openstreetmap") {
                updateProvider({
                  type: "openstreetmap",
                  embedUrl: provider.embedUrl,
                  zoom: "zoom" in provider ? provider.zoom : 14,
                });
              } else if (type === "bing") {
                updateProvider({
                  type: "bing",
                  embedUrl: provider.embedUrl,
                  zoom: "zoom" in provider ? provider.zoom : 14,
                });
              } else {
                updateProvider({
                  type: "google",
                  embedUrl: provider.embedUrl,
                  zoom: "zoom" in provider ? provider.zoom : 14,
                });
              }
            }}
            options={[
              { value: "google", label: "Google Maps" },
              { value: "bing", label: "Bing Maps" },
              { value: "openstreetmap", label: "OpenStreetMap" },
              { value: "custom", label: "Custom iframe" },
            ]}
          />
          <div>
            <Label className="text-xs">Embed URL</Label>
            <Input
              className="mt-1 h-8 text-sm"
              value={provider.embedUrl}
              onChange={(e) => updateProvider({ ...provider, embedUrl: e.target.value } as MapProvider)}
            />
          </div>
          {provider.type !== "custom" ? (
            <div>
              <Label className="text-xs">Zoom level</Label>
              <Input
                type="number"
                min={1}
                max={20}
                className="mt-1 h-8 text-sm"
                value={String(provider.zoom ?? 14)}
                onChange={(e) =>
                  updateProvider({
                    ...provider,
                    zoom: Number(e.target.value) || 14,
                  } as MapProvider)
                }
              />
            </div>
          ) : null}
          <div>
            <Label className="text-xs">Height (px)</Label>
            <Input
              type="number"
              className="mt-1 h-8 text-sm"
              value={String(block.props.height ?? 400)}
              onChange={(e) => setProp("height", Number(e.target.value) || 400)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.props.roundedCorners !== false}
              onChange={(e) => setProp("roundedCorners", e.target.checked)}
            />
            Rounded corners
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(block.props.showMarker)}
              onChange={(e) => setProp("showMarker", e.target.checked)}
            />
            Show marker
          </label>
          <LocalizedBlockInput block={block} field="markerLabel" label="Marker label" />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.props.showDirections !== false}
              onChange={(e) => setProp("showDirections", e.target.checked)}
            />
            Show directions button
          </label>
          <LocalizedBlockInput block={block} field="directionsText" label="Directions button text" />
          <div>
            <Label className="text-xs">Directions URL</Label>
            <Input
              className="mt-1 h-8 text-sm"
              value={(block.props.directionsUrl as string) ?? ""}
              onChange={(e) => setProp("directionsUrl", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(block.props.showOverlayCard)}
              onChange={(e) => setProp("showOverlayCard", e.target.checked)}
            />
            Show overlay card
          </label>
          <LocalizedBlockInput block={block} field="overlayHours" label="Overlay business hours" />
        </>
      }
    />
  );
}
