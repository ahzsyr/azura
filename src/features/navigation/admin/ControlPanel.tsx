import type {
  HeaderBorderRadius,
  HeaderFirstBlockOverlaySettings,
  HeaderWorkspace,
  MenuBlurStrength,
  MenuPanelAnimation,
  MenuShadowStyle,
  MenuSurfaceStyle,
  MobileNavStyle,
  MobileNavAnimation,
  MobileNavDensity,
} from "@/features/navigation/types";
import { resolveMenuAppearance, resolveMobileMenuAppearance } from "@/features/navigation/header-menu-appearance";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { setSettings } from "@/features/navigation/header-store";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { HEADER_DESKTOP_OPTIONS } from "./headerDesktopModeOptions";
import { OptionButtonGroup } from "./header-builder-ui";
import { cn } from "@/lib/utils";

export type HeaderSettingsSection = "mobile" | "headerStyle" | "headerDesktop";

interface Props {
  workspace: HeaderWorkspace;
  section: HeaderSettingsSection;
}

export function HeaderSettingsPanel({ workspace, section }: Props) {
  const { settings } = workspace;

  if (section === "mobile") {
    const mobileAppearance = resolveMobileMenuAppearance(settings);
    const mobileSurface =
      settings.mobileMenuSurface ??
      settings.menuSurface ??
      settings.overlaySurface ??
      "glass";

    return (
      <div className="space-y-4">
        <AdminCollapsibleSection title="Mobile navigation type" defaultOpen>
          <OptionButtonGroup
            value={settings.mobileType}
            options={[
              { value: "hamburger", label: "Hamburger" },
              { value: "bottom", label: "Bottom bar" },
              { value: "fullscreen", label: "Fullscreen" },
              { value: "accordion", label: "Accordion" },
              { value: "tabs", label: "Tab nav" },
              { value: "search", label: "Search first" },
            ]}
            onChange={(v) => setSettings({ mobileType: v })}
            columns={3}
          />
        </AdminCollapsibleSection>

        <AdminCollapsibleSection title="Mobile appearance">
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">Style</p>
              <OptionButtonGroup
                value={settings.mobileNavStyle ?? "minimal"}
                options={(
                  ["minimal", "card", "divider", "bordered"] as MobileNavStyle[]
                ).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
                onChange={(v) => setSettings({ mobileNavStyle: v })}
                columns={4}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Animation</p>
              <OptionButtonGroup
                value={settings.mobileMenuAnimation ?? settings.mobileNavAnimation ?? "slide"}
                options={(["slide", "fade", "scale", "spring"] as MobileNavAnimation[]).map((v) => ({
                  value: v,
                  label: v.charAt(0).toUpperCase() + v.slice(1),
                }))}
                onChange={(v) =>
                  setSettings({
                    mobileMenuAnimation: v,
                    mobileNavAnimation: v,
                  })
                }
                columns={4}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Mobile-only open/close animation. Desktop mega menus use Header → Style.
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Density</p>
              <OptionButtonGroup
                value={settings.mobileNavDensity ?? "comfortable"}
                options={(["compact", "comfortable", "spacious"] as MobileNavDensity[]).map(
                  (v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })
                )}
                onChange={(v) => setSettings({ mobileNavDensity: v })}
                columns={3}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Options</p>
              <OptionButtonGroup
                value={settings.mobileNavShowIcons !== false ? "icons-on" : "icons-off"}
                options={[
                  { value: "icons-on", label: "Icons on" },
                  { value: "icons-off", label: "Icons off" },
                ]}
                onChange={(v) => setSettings({ mobileNavShowIcons: v === "icons-on" })}
                columns={2}
              />
              <div className="mt-2">
                <OptionButtonGroup
                  value={settings.mobileNavShowArrows !== false ? "arrows-on" : "arrows-off"}
                  options={[
                    { value: "arrows-on", label: "Arrows on" },
                    { value: "arrows-off", label: "Arrows off" },
                  ]}
                  onChange={(v) => setSettings({ mobileNavShowArrows: v === "arrows-on" })}
                  columns={2}
                />
              </div>
            </div>
          </div>
        </AdminCollapsibleSection>

        <AdminCollapsibleSection
          title="Panel background"
          description="These settings apply only to the mobile menu. Desktop mega menus use Header → Style → Mega menu panels."
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Background style</p>
              <OptionButtonGroup
                value={mobileSurface}
                options={(
                  [
                    ["transparent", "Transparent"],
                    ["glass", "Glass"],
                    ["solid", "Solid"],
                  ] as [MenuSurfaceStyle, string][]
                ).map(([value, label]) => ({ value, label }))}
                onChange={(v) =>
                  setSettings({
                    mobileMenuSurface: v as MenuSurfaceStyle,
                    mobileMenuGlassEnabled: v === "glass",
                  })
                }
                columns={3}
              />
              {mobileSurface === "transparent" ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Transparent panels may reduce menu readability over busy hero sections.
                </p>
              ) : null}
            </div>
            {mobileSurface === "glass" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.mobileMenuGlassEnabled !== false}
                  onChange={(e) => setSettings({ mobileMenuGlassEnabled: e.target.checked })}
                />
                Glass effect (backdrop blur)
              </label>
            )}
            {mobileSurface === "glass" && (
              <div>
                <p className="mb-2 text-sm font-medium">Blur strength</p>
                <OptionButtonGroup
                  value={settings.mobileMenuBlurStrength ?? settings.menuBlurStrength ?? "medium"}
                  options={(
                    [
                      ["light", "Light (8px)"],
                      ["medium", "Medium (12px)"],
                      ["strong", "Strong (20px)"],
                    ] as [MenuBlurStrength, string][]
                  ).map(([value, label]) => ({ value, label }))}
                  onChange={(v) => setSettings({ mobileMenuBlurStrength: v })}
                  columns={3}
                />
              </div>
            )}
            {mobileSurface !== "transparent" && (
              <div>
                <Label className="text-xs">
                  Transparency ({mobileAppearance.transparency}% effective)
                </Label>
                <input
                  type="range"
                  min={40}
                  max={98}
                  step={1}
                  value={settings.mobileMenuTransparency ?? mobileAppearance.transparency}
                  onChange={(e) =>
                    setSettings({ mobileMenuTransparency: Number(e.target.value) })
                  }
                  className="mt-2 w-full"
                />
                {mobileSurface === "glass" &&
                settings.mobileMenuTransparency == null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Glass defaults to at least 96% opacity for readability.
                  </p>
                ) : null}
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium">Shadow style</p>
              <OptionButtonGroup
                value={settings.mobileMenuShadow ?? settings.menuShadow ?? "strong"}
                options={(
                  [
                    ["none", "None"],
                    ["soft", "Soft"],
                    ["strong", "Strong"],
                  ] as [MenuShadowStyle, string][]
                ).map(([value, label]) => ({ value, label }))}
                onChange={(v) => setSettings({ mobileMenuShadow: v })}
                columns={3}
              />
            </div>
          </div>
        </AdminCollapsibleSection>
      </div>
    );
  }

  if (section === "headerStyle") {
    const firstBlockOverlay: HeaderFirstBlockOverlaySettings =
      settings.firstBlockHeaderOverlay ?? { enabled: false, contentInset: "auto" };

    const patchFirstBlockOverlay = (patch: Partial<HeaderFirstBlockOverlaySettings>) => {
      setSettings({
        firstBlockHeaderOverlay: { ...firstBlockOverlay, ...patch },
      });
    };

    const isBoxed =
      settings.headerStyle === "boxed-compact" || settings.headerStyle === "boxed-minimal";
    const menuAppearance = resolveMenuAppearance(settings);
    const desktopMenuSurface =
      settings.menuSurface ?? settings.overlaySurface ?? "glass";

    return (
      <div className="space-y-4">
        <AdminCollapsibleSection title="Header style" defaultOpen>
          <OptionButtonGroup
            value={settings.headerStyle}
            options={(
              ["normal-compact", "normal-minimal", "boxed-compact", "boxed-minimal"] as const
            ).map((style) => ({
              value: style,
              label: style.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            }))}
            onChange={(v) => setSettings({ headerStyle: v })}
            columns={2}
          />
        </AdminCollapsibleSection>

        <AdminCollapsibleSection title="Corner radius">
          <OptionButtonGroup
            value={settings.headerBorderRadius ?? "lg"}
            options={(
              [
                ["none", "Square"],
                ["sm", "Small"],
                ["md", "Medium"],
                ["lg", "Large"],
                ["xl", "X-Large"],
              ] as [HeaderBorderRadius, string][]
            ).map(([value, label]) => ({ value, label }))}
            onChange={(v) => setSettings({ headerBorderRadius: v })}
            columns={3}
          />
        </AdminCollapsibleSection>

        <AdminCollapsibleSection
          title="Mega menu panels"
          description="Dropdown and mega menu styles on desktop. Mobile menu has its own panel settings under Mobile → Panel background."
          defaultOpen
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Background style</p>
              <OptionButtonGroup
                value={desktopMenuSurface}
                options={(
                  [
                    ["transparent", "Transparent"],
                    ["glass", "Glass"],
                    ["solid", "Solid"],
                  ] as [MenuSurfaceStyle, string][]
                ).map(([value, label]) => ({ value, label }))}
                onChange={(v) =>
                  setSettings({
                    menuSurface: v as MenuSurfaceStyle,
                    menuGlassEnabled: v === "glass",
                  })
                }
                columns={3}
              />
              {desktopMenuSurface === "transparent" ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Transparent panels may reduce menu readability over busy hero sections.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Uses theme surface colors. When unset, matches header overlay surface (
                  {settings.overlaySurface ?? "glass"}).
                </p>
              )}
            </div>
            {desktopMenuSurface === "glass" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.menuGlassEnabled !== false}
                  onChange={(e) => setSettings({ menuGlassEnabled: e.target.checked })}
                />
                Glass effect (backdrop blur)
              </label>
            )}
            {desktopMenuSurface === "glass" && (
              <div>
                <p className="mb-2 text-sm font-medium">Blur strength</p>
                <OptionButtonGroup
                  value={settings.menuBlurStrength ?? "medium"}
                  options={(
                    [
                      ["light", "Light (8px)"],
                      ["medium", "Medium (12px)"],
                      ["strong", "Strong (20px)"],
                    ] as [MenuBlurStrength, string][]
                  ).map(([value, label]) => ({ value, label }))}
                  onChange={(v) => setSettings({ menuBlurStrength: v })}
                  columns={3}
                />
              </div>
            )}
            {desktopMenuSurface === "glass" && (
              <div>
                <Label className="text-xs">
                  Transparency ({menuAppearance.transparency}%)
                </Label>
                <input
                  type="range"
                  min={40}
                  max={98}
                  step={1}
                  value={settings.menuTransparency ?? menuAppearance.transparency}
                  onChange={(e) => setSettings({ menuTransparency: Number(e.target.value) })}
                  className="mt-2 w-full"
                />
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium">Shadow style</p>
              <OptionButtonGroup
                value={settings.menuShadow ?? "strong"}
                options={(
                  [
                    ["none", "None"],
                    ["soft", "Soft"],
                    ["strong", "Strong"],
                  ] as [MenuShadowStyle, string][]
                ).map(([value, label]) => ({ value, label }))}
                onChange={(v) => setSettings({ menuShadow: v })}
                columns={3}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Panel animation</p>
              <OptionButtonGroup
                value={settings.menuPanelAnimation ?? "slide"}
                options={(["slide", "fade", "scale"] as MenuPanelAnimation[]).map((v) => ({
                  value: v,
                  label: v.charAt(0).toUpperCase() + v.slice(1),
                }))}
                onChange={(v) =>
                  setSettings({
                    menuPanelAnimation: v,
                  })
                }
                columns={3}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Desktop mega/dropdown animation. Corner radius uses the setting above (
                {settings.headerBorderRadius ?? "lg"}).
              </p>
            </div>
          </div>
        </AdminCollapsibleSection>

        <AdminCollapsibleSection
          title="Header overlay"
          description="Display the site header over the first block on CMS pages (e.g. hero). Requires a boxed header style."
          defaultOpen
        >
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(firstBlockOverlay.enabled)}
                onChange={(e) => patchFirstBlockOverlay({ enabled: e.target.checked })}
              />
              Display site header over first page block
            </label>
            {!isBoxed && firstBlockOverlay.enabled && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Select a <strong>boxed</strong> header style above for overlay to apply on the live
                site.
              </p>
            )}
            {firstBlockOverlay.enabled && (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium">Header surface</p>
                  <OptionButtonGroup
                    value={settings.overlaySurface ?? "glass"}
                    options={(
                      [
                        ["transparent", "Transparent"],
                        ["glass", "Glass"],
                        ["solid", "Solid"],
                      ] as const
                    ).map(([value, label]) => ({ value, label }))}
                    onChange={(v) =>
                      setSettings({
                        overlaySurface: v as "transparent" | "glass" | "solid",
                      })
                    }
                    columns={3}
                  />
                </div>
                <div>
                  <Label className="text-xs">Content inset</Label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={firstBlockOverlay.contentInset ?? "auto"}
                    onChange={(e) =>
                      patchFirstBlockOverlay({
                        contentInset: e.target.value as "auto" | "custom",
                      })
                    }
                  >
                    <option value="auto">Auto (header height)</option>
                    <option value="custom">Custom padding</option>
                  </select>
                </div>
                {firstBlockOverlay.contentInset === "custom" && (
                  <div>
                    <Label className="text-xs">Padding top</Label>
                    <Input
                      value={firstBlockOverlay.paddingTop ?? ""}
                      onChange={(e) => patchFirstBlockOverlay({ paddingTop: e.target.value })}
                      placeholder="calc(76px + 12px)"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </AdminCollapsibleSection>
      </div>
    );
  }

  return (
    <AdminCollapsibleSection
      title="Desktop header behavior"
      description="Positioning on desktop (≥969px). Applies on the live site only — preview stays static."
      defaultOpen
    >
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Desktop header behavior">
        {HEADER_DESKTOP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={settings.headerDesktopMode === opt.value}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              settings.headerDesktopMode === opt.value
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted/50"
            )}
            onClick={() => setSettings({ headerDesktopMode: opt.value })}
          >
            <span className="block text-sm font-medium">{opt.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{opt.desc}</span>
          </button>
        ))}
      </div>
    </AdminCollapsibleSection>
  );
}
