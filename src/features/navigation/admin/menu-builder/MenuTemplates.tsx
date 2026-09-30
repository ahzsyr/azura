"use client";

import { Sparkles } from "lucide-react";
import { MenuTemplateService, type MenuTemplateId } from "@/features/navigation/menu-template-service";
import {
  megaMenuPresetService,
  type MegaMenuPresetId,
} from "@/features/navigation/mega-menu-presets";
import { HeaderSelect } from "../header-builder-ui";
import { Button } from "@/components/ui/button";

type Props = {
  templateId: MenuTemplateId;
  onTemplateIdChange: (id: MenuTemplateId) => void;
  onApply: () => void;
  megaPresetId?: MegaMenuPresetId;
  onMegaPresetIdChange?: (id: MegaMenuPresetId) => void;
  onApplyMegaPreset?: () => void;
  hasSelectedParent?: boolean;
};

export function MenuTemplates({
  templateId,
  onTemplateIdChange,
  onApply,
  megaPresetId = "unifi-start-here",
  onMegaPresetIdChange,
  onApplyMegaPreset,
  hasSelectedParent,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Templates</p>
          <p className="text-xs text-muted-foreground">
            Replace the current menu items with a starter template.
          </p>
        </div>
        <HeaderSelect value={templateId} onChange={(v) => onTemplateIdChange(v as MenuTemplateId)}>
          {MenuTemplateService.list().map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </HeaderSelect>
        <Button size="sm" variant="outline" className="w-full" onClick={onApply}>
          <Sparkles className="me-1 h-4 w-4" />
          Apply template
        </Button>
      </div>

      {onApplyMegaPreset && onMegaPresetIdChange ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Mega menu presets</p>
            <p className="text-xs text-muted-foreground">
              Apply ordinary v2 mega config to the selected parent (generates children + panels).
            </p>
          </div>
          <HeaderSelect
            value={megaPresetId}
            onChange={(v) => onMegaPresetIdChange(v as MegaMenuPresetId)}
          >
            {megaMenuPresetService.list().map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </HeaderSelect>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={onApplyMegaPreset}
            disabled={!hasSelectedParent}
          >
            <Sparkles className="me-1 h-4 w-4" />
            Apply mega preset
          </Button>
          {!hasSelectedParent ? (
            <p className="text-[11px] text-muted-foreground">Select a parent menu item first.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
