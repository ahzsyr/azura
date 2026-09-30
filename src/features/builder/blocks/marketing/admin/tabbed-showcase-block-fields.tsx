"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { IconNameSelect } from "@/features/builder/blocks/marketing/admin/icon-name-select";
import {
  emptyLocalizedItemFields,
  itemFieldPropKey,
  LocalizedItemFields,
  readItemFieldValue,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";
import {
  newId,
  defaultVisualLayerAnimation,
  type FrameSequence,
  type FrameSequenceFrame,
  type TabbedShowcaseFeature,
  type TabbedShowcaseTab,
  type TabbedShowcaseVisual,
  type VisualLayer,
  type VisualLayerAnimation,
  type VisualLayerAnimationType,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

const ANIMATION_TYPE_OPTIONS: Array<{ value: VisualLayerAnimationType; label: string }> = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "scale", label: "Scale" },
  { value: "fadeScale", label: "Fade + Scale" },
  { value: "slideUp", label: "Slide up" },
  { value: "slideDown", label: "Slide down" },
  { value: "slideLeft", label: "Slide left" },
  { value: "slideRight", label: "Slide right" },
  { value: "fadeSlideUp", label: "Fade + Slide up" },
  { value: "fadeSlideDown", label: "Fade + Slide down" },
  { value: "fadeSlideLeft", label: "Fade + Slide left" },
  { value: "fadeSlideRight", label: "Fade + Slide right" },
];

function emptyFeature(): TabbedShowcaseFeature {
  return {
    id: newId("feat"),
    icon: "check",
    ...emptyLocalizedItemFields(["description"]),
  } as TabbedShowcaseFeature;
}

function emptyLayer(): VisualLayer {
  return {
    id: newId("layer"),
    imageUrl: "",
    mediaAssetId: "",
    x: 0,
    y: 0,
    opacity: 1,
    zIndex: 0,
    scale: 1,
    animation: defaultVisualLayerAnimation(),
  };
}

function emptyFrame(): FrameSequenceFrame {
  return { id: newId("frame"), imageUrl: "", mediaAssetId: "" };
}

function emptySequence(): FrameSequence {
  return {
    id: newId("seq"),
    frames: [],
    x: 0,
    y: 0,
    zIndex: 10,
    fps: 12,
    loop: true,
    animation: defaultVisualLayerAnimation({ delayMs: 120 }),
  };
}

function emptyVisual(): TabbedShowcaseVisual {
  return {
    stageAspectRatio: "980/780",
    layers: [],
    sequences: [],
  };
}

function emptyTab(): TabbedShowcaseTab {
  return {
    id: newId("tab"),
    label: "",
    title: "",
    features: [],
    visual: emptyVisual(),
    ...emptyLocalizedItemFields(["label", "title"]),
  } as TabbedShowcaseTab;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        className="mt-1 h-8 text-sm"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function AnimationSettingsFields({
  animation,
  onChange,
}: {
  animation: VisualLayerAnimation;
  onChange: (patch: Partial<VisualLayerAnimation>) => void;
}) {
  const showDistance = animation.type.includes("slide");
  const showFromScale = animation.type === "scale" || animation.type === "fadeScale";

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
      <Label className="text-xs font-medium">Entrance animation</Label>
      <div>
        <Label className="text-xs">Type</Label>
        <select
          className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
          value={animation.type}
          onChange={(e) => onChange({ type: e.target.value as VisualLayerAnimationType })}
        >
          {ANIMATION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {animation.type !== "none" ? (
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Duration (ms)"
            value={animation.durationMs}
            min={0}
            max={5000}
            step={50}
            onChange={(durationMs) => onChange({ durationMs })}
          />
          <NumberField
            label="Delay (ms)"
            value={animation.delayMs}
            min={0}
            max={5000}
            step={50}
            onChange={(delayMs) => onChange({ delayMs })}
          />
          {showDistance ? (
            <NumberField
              label="Slide distance (px)"
              value={animation.distance}
              min={0}
              max={400}
              onChange={(distance) => onChange({ distance })}
            />
          ) : null}
          {showFromScale ? (
            <NumberField
              label="From scale"
              value={animation.fromScale}
              min={0}
              max={2}
              step={0.05}
              onChange={(fromScale) => onChange({ fromScale })}
            />
          ) : null}
          <div>
            <Label className="text-xs">Easing</Label>
            <select
              className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
              value={animation.easing}
              onChange={(e) => onChange({ easing: e.target.value as VisualLayerAnimation["easing"] })}
            >
              <option value="easeOut">Ease out</option>
              <option value="easeInOut">Ease in-out</option>
              <option value="linear">Linear</option>
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LayerForm({
  layer,
  onUpdate,
}: {
  layer: VisualLayer;
  onUpdate: (patch: Partial<VisualLayer>) => void;
}) {
  const animation = layer.animation ?? defaultVisualLayerAnimation();

  return (
    <div className="space-y-3">
      <UrlPrimaryMediaPickerField
        label="Layer image"
        mediaTypes={["IMAGE", "SVG"]}
        url={layer.imageUrl}
        onPick={({ url, mediaId }) => onUpdate({ imageUrl: url, mediaAssetId: mediaId ?? "" })}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X (%)" value={layer.x} onChange={(x) => onUpdate({ x })} />
        <NumberField label="Y (%)" value={layer.y} onChange={(y) => onUpdate({ y })} />
        <NumberField label="Width (%)" value={layer.width} onChange={(width) => onUpdate({ width })} />
        <NumberField label="Height (%)" value={layer.height} onChange={(height) => onUpdate({ height })} />
        <NumberField label="Opacity" value={layer.opacity} min={0} max={1} step={0.05} onChange={(opacity) => onUpdate({ opacity })} />
        <NumberField label="Z-index" value={layer.zIndex} onChange={(zIndex) => onUpdate({ zIndex })} />
        <NumberField label="Scale" value={layer.scale} min={0.1} max={5} step={0.1} onChange={(scale) => onUpdate({ scale })} />
      </div>
      <AnimationSettingsFields
        animation={animation}
        onChange={(patch) => onUpdate({ animation: { ...animation, ...patch } })}
      />
    </div>
  );
}

function SequenceForm({
  sequence,
  onUpdate,
}: {
  sequence: FrameSequence;
  onUpdate: (patch: Partial<FrameSequence>) => void;
}) {
  const frames = sequence.frames;
  const animation = sequence.animation ?? defaultVisualLayerAnimation({ delayMs: 120 });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X (%)" value={sequence.x} onChange={(x) => onUpdate({ x })} />
        <NumberField label="Y (%)" value={sequence.y} onChange={(y) => onUpdate({ y })} />
        <NumberField label="Width (%)" value={sequence.width} onChange={(width) => onUpdate({ width })} />
        <NumberField label="Height (%)" value={sequence.height} onChange={(height) => onUpdate({ height })} />
        <NumberField label="Z-index" value={sequence.zIndex} onChange={(zIndex) => onUpdate({ zIndex })} />
        <NumberField label="FPS" value={sequence.fps} min={1} max={60} onChange={(fps) => onUpdate({ fps })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sequence.loop}
          onChange={(e) => onUpdate({ loop: e.target.checked })}
        />
        Loop frame sequence
      </label>

      <AnimationSettingsFields
        animation={animation}
        onChange={(patch) => onUpdate({ animation: { ...animation, ...patch } })}
      />

      <ModalRepeatableListEditor
        items={frames}
        onChange={(next) => onUpdate({ frames: next })}
        createEmpty={emptyFrame}
        strings={{
          sectionLabel: "Frames",
          addButtonLabel: "Add frame",
          emptyLabel: "No frames yet.",
          dialogTitleCreate: "Add frame",
          dialogTitleEdit: "Edit frame",
          saveButtonLabelCreate: "Save frame",
          saveButtonLabelEdit: "Save frame",
        }}
        renderSummary={(frame, index) => ({
          title: frame.imageUrl ? `Frame ${index + 1}` : `Empty frame ${index + 1}`,
          meta: frame.imageUrl ? ["Image attached"] : [],
        })}
        renderForm={(draft, onFrameUpdate) => (
          <UrlPrimaryMediaPickerField
            label="Frame image"
            mediaTypes={["IMAGE", "SVG"]}
            url={draft.imageUrl}
            onPick={({ url, mediaId }) => onFrameUpdate({ imageUrl: url, mediaAssetId: mediaId ?? "" })}
          />
        )}
      />
    </div>
  );
}

function FeatureForm({
  feature,
  onUpdate,
}: {
  feature: TabbedShowcaseFeature;
  onUpdate: (patch: Partial<TabbedShowcaseFeature>) => void;
}) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;

  return (
    <div className="space-y-3">
      <IconNameSelect value={feature.icon} onChange={(icon) => onUpdate({ icon })} />
      <LocalizedItemFields
        fields={[{ key: "description", label: "Description", multiline: true }]}
        values={feature as unknown as Record<string, string>}
        onChange={(patch) => {
          const nextPatch = { ...patch } as Record<string, string>;
          if (activeCode === defaultCode) {
            const localizedKey = itemFieldPropKey("description", activeCode);
            const value = nextPatch[localizedKey];
            if (typeof value === "string") nextPatch.description = value;
          }
          onUpdate(nextPatch as Partial<TabbedShowcaseFeature>);
        }}
      />
    </div>
  );
}

function VisualEditor({
  visual,
  onChange,
}: {
  visual: TabbedShowcaseVisual;
  onChange: (visual: TabbedShowcaseVisual) => void;
}) {
  const updateVisual = (patch: Partial<TabbedShowcaseVisual>) => onChange({ ...visual, ...patch });

  return (
    <AdminCollapsibleSection title="Visual composition" defaultOpen={false}>
      <div className="space-y-4">
        <div>
          <Label className="text-xs">Stage aspect ratio</Label>
          <Input
            className="mt-1 h-8 text-sm"
            placeholder="980/780"
            value={visual.stageAspectRatio}
            onChange={(e) => updateVisual({ stageAspectRatio: e.target.value })}
          />
        </div>

        <ModalRepeatableListEditor
          items={visual.layers}
          onChange={(layers) => updateVisual({ layers })}
          createEmpty={emptyLayer}
          strings={{
            sectionLabel: "Static layers",
            addButtonLabel: "Add layer",
            emptyLabel: "No static layers yet.",
            dialogTitleCreate: "Add layer",
            dialogTitleEdit: "Edit layer",
            saveButtonLabelCreate: "Save layer",
            saveButtonLabelEdit: "Save layer",
          }}
          renderSummary={(layer, index) => ({
            title: layer.imageUrl ? `Layer ${index + 1}` : `Empty layer ${index + 1}`,
            meta: [
              `z:${layer.zIndex}`,
              `(${layer.x}%, ${layer.y}%)`,
              layer.animation?.type ?? "fade",
            ],
          })}
          renderForm={(draft, onUpdate) => <LayerForm layer={draft} onUpdate={onUpdate} />}
        />

        <ModalRepeatableListEditor
          items={visual.sequences}
          onChange={(sequences) => updateVisual({ sequences })}
          createEmpty={emptySequence}
          strings={{
            sectionLabel: "Frame sequences",
            addButtonLabel: "Add sequence",
            emptyLabel: "No animated sequences yet.",
            dialogTitleCreate: "Add sequence",
            dialogTitleEdit: "Edit sequence",
            saveButtonLabelCreate: "Save sequence",
            saveButtonLabelEdit: "Save sequence",
          }}
          renderSummary={(sequence, index) => ({
            title: `Sequence ${index + 1}`,
            meta: [
              `${sequence.frames.length} frames`,
              `${sequence.fps} fps`,
              sequence.animation?.type ?? "fade",
            ],
          })}
          renderForm={(draft, onUpdate) => <SequenceForm sequence={draft} onUpdate={onUpdate} />}
        />
      </div>
    </AdminCollapsibleSection>
  );
}

function TabForm({
  tab,
  onUpdate,
}: {
  tab: TabbedShowcaseTab;
  onUpdate: (patch: Partial<TabbedShowcaseTab>) => void;
}) {
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;

  const syncLocalizedBaseKeys = (patch: Record<string, string>) => {
    const nextPatch = { ...patch };
    if (activeCode === defaultCode) {
      for (const key of ["label", "title"]) {
        const localizedKey = itemFieldPropKey(key, activeCode);
        const value = nextPatch[localizedKey];
        if (typeof value === "string") nextPatch[key] = value;
      }
    }
    return nextPatch as Partial<TabbedShowcaseTab>;
  };

  return (
    <div className="space-y-4">
      <LocalizedItemFields
        fields={[
          { key: "label", label: "Tab label" },
          { key: "title", label: "Panel title" },
        ]}
        values={tab as unknown as Record<string, string>}
        onChange={(patch) => onUpdate(syncLocalizedBaseKeys(patch))}
      />

      <ModalRepeatableListEditor
        items={tab.features}
        onChange={(features) => onUpdate({ features })}
        createEmpty={emptyFeature}
        strings={{
          sectionLabel: "Features",
          addButtonLabel: "Add feature",
          emptyLabel: "No features yet.",
          dialogTitleCreate: "Add feature",
          dialogTitleEdit: "Edit feature",
          saveButtonLabelCreate: "Save feature",
          saveButtonLabelEdit: "Save feature",
        }}
        renderSummary={(feature, index) => ({
          title: readItemFieldValue(feature as unknown as Record<string, string>, "description", activeCode).trim() || `Feature ${index + 1}`,
          meta: feature.icon ? [feature.icon] : [],
        })}
        renderForm={(draft, onFeatureUpdate) => <FeatureForm feature={draft} onUpdate={onFeatureUpdate} />}
      />

      <VisualEditor visual={tab.visual} onChange={(visual) => onUpdate({ visual })} />
    </div>
  );
}

export function TabbedShowcaseBlockFields({ block, onChange }: Props) {
  const p = block.props;
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const tabs = (p.tabs as TabbedShowcaseTab[]) ?? [];
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={(p.showNavArrows as boolean | undefined) ?? true}
          onChange={(e) => setProp("showNavArrows", e.target.checked)}
        />
        Show prev/next arrows
      </label>

      <ModalRepeatableListEditor
        items={tabs}
        onChange={(next) => setProp("tabs", next)}
        createEmpty={emptyTab}
        strings={{
          sectionLabel: "Tabs",
          addButtonLabel: "Add tab",
          emptyLabel: "No tabs yet. Click Add tab to create one.",
          dialogTitleCreate: "Add tab",
          dialogTitleEdit: "Edit tab",
          saveButtonLabelCreate: "Save tab",
          saveButtonLabelEdit: "Save tab",
        }}
        renderSummary={(tab, index) => ({
          title: readItemFieldValue(tab as unknown as Record<string, string>, "label", activeCode).trim() || `Tab ${index + 1}`,
          meta: [`${tab.features.length} features`],
        })}
        renderForm={(draft, onUpdate) => <TabForm tab={draft} onUpdate={onUpdate} />}
      />
    </div>
  );
}
