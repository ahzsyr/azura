"use client";

import { useEffect, useState, useTransition } from "react";
import type { BlockNode, PageBlocks } from "@/types/builder";
import { createBlock } from "@/schemas/blocks";
import {
  listBlockPresetsAction,
  saveBlockPresetAction,
  deleteBlockPresetAction,
  listPageTemplatesAction,
  savePageTemplateAction,
} from "@/features/builder/actions";
import { BUILTIN_PAGE_TEMPLATES } from "@/features/builder/constants";
import { PageTemplateGallery } from "./page-template-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BlockPresetRecord } from "@/features/builder/constants";

type Props = {
  selectedBlock: BlockNode | null;
  onInsertBlock: (block: BlockNode) => void;
  onApplyTemplate: (blocks: PageBlocks) => void;
  currentBlocks: PageBlocks;
  /** When true, only show block presets (templates handled separately). */
  presetsOnly?: boolean;
  /** When true, only show page templates gallery (for page editor Templates tab). */
  templatesOnly?: boolean;
};

export function BlockPresetPanel({
  selectedBlock,
  onInsertBlock,
  onApplyTemplate,
  currentBlocks,
  presetsOnly = false,
  templatesOnly = false,
}: Props) {
  const [presets, setPresets] = useState<Record<string, BlockPresetRecord>>({});
  const [customTemplates, setCustomTemplates] = useState<Record<string, { name: string; blocks: PageBlocks }>>({});
  const [presetName, setPresetName] = useState("");
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const [p, t] = await Promise.all([listBlockPresetsAction(), listPageTemplatesAction()]);
      setPresets(p);
      const custom = Object.fromEntries(
        Object.entries(t).filter(([k]) => !BUILTIN_PAGE_TEMPLATES[k])
      );
      setCustomTemplates(custom as Record<string, { name: string; blocks: PageBlocks }>);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const savePreset = () => {
    if (!selectedBlock || !presetName.trim()) return;
    const key = presetName.trim().toLowerCase().replace(/\s+/g, "-");
    startTransition(async () => {
      await saveBlockPresetAction(key, {
        name: presetName.trim(),
        type: selectedBlock.type,
        props: selectedBlock.props,
      });
      setPresetName("");
      load();
    });
  };

  const savePageTemplate = (name: string) => {
    const key = name.toLowerCase().replace(/\s+/g, "-");
    startTransition(async () => {
      await savePageTemplateAction(key, name, currentBlocks);
      load();
    });
  };

  if (templatesOnly) {
    return (
      <PageTemplateGallery
        customTemplates={customTemplates}
        onApplyTemplate={onApplyTemplate}
        onSaveAsTemplate={savePageTemplate}
        savePending={pending}
      />
    );
  }

  if (presetsOnly) {
    return (
      <BlockPresetsList
        presets={presets}
        selectedBlock={selectedBlock}
        presetName={presetName}
        onPresetNameChange={setPresetName}
        onSavePreset={savePreset}
        onInsertBlock={onInsertBlock}
        onDeletePreset={(key) => {
          if (confirm("Delete preset?")) {
            startTransition(async () => {
              await deleteBlockPresetAction(key);
              load();
            });
          }
        }}
        pending={pending}
      />
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <PageTemplateGallery
        customTemplates={customTemplates}
        onApplyTemplate={onApplyTemplate}
        onSaveAsTemplate={savePageTemplate}
        savePending={pending}
      />
      <BlockPresetsList
        presets={presets}
        selectedBlock={selectedBlock}
        presetName={presetName}
        onPresetNameChange={setPresetName}
        onSavePreset={savePreset}
        onInsertBlock={onInsertBlock}
        onDeletePreset={(key) => {
          if (confirm("Delete preset?")) {
            startTransition(async () => {
              await deleteBlockPresetAction(key);
              load();
            });
          }
        }}
        pending={pending}
      />
    </div>
  );
}

export function BlockPresetsList({
  presets,
  selectedBlock,
  presetName,
  onPresetNameChange,
  onSavePreset,
  onInsertBlock,
  onDeletePreset,
  pending,
}: {
  presets: Record<string, BlockPresetRecord>;
  selectedBlock: BlockNode | null;
  presetName: string;
  onPresetNameChange: (v: string) => void;
  onSavePreset: () => void;
  onInsertBlock: (block: BlockNode) => void;
  onDeletePreset: (key: string) => void;
  pending: boolean;
}) {
  return (
    <div>
      <h4 className="font-semibold mb-2">Block presets</h4>
      {selectedBlock ? (
        <div className="flex gap-2 mb-2">
          <Input
            placeholder={`Preset name (${selectedBlock.type})`}
            value={presetName}
            onChange={(e) => onPresetNameChange(e.target.value)}
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" disabled={pending} onClick={onSavePreset}>
            Save block
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-2">Select a block in Content to save as preset.</p>
      )}
      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {Object.entries(presets).map(([key, preset]) => (
          <li key={key} className="flex items-center justify-between gap-2 border rounded px-2 py-1">
            <button
              type="button"
              className="text-xs hover:text-primary truncate text-start flex-1"
              onClick={() => {
                onInsertBlock(createBlock(preset.type as BlockNode["type"], preset.props) as BlockNode);
              }}
            >
              {preset.name} <span className="text-muted-foreground">({preset.type})</span>
            </button>
            <button
              type="button"
              className="text-xs text-destructive shrink-0"
              onClick={() => onDeletePreset(key)}
            >
              ×
            </button>
          </li>
        ))}
        {Object.keys(presets).length === 0 && (
          <li className="text-xs text-muted-foreground">No saved presets yet.</li>
        )}
      </ul>
    </div>
  );
}
