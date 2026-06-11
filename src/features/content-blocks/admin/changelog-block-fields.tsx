"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/content-blocks/schemas/content-blocks";
import { ItemCard, RepeatableSection } from "@/features/content-blocks/admin/shared/repeatable-section";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/marketing-blocks/admin/localized-item-fields";

type Entry = { id: string; [key: string]: string };
type Sections = {
  features: Entry[];
  improvements: Entry[];
  fixes: Entry[];
  breaking: Entry[];
};
type Release = {
  id: string;
  version: string;
  date: string;
  status: "released" | "beta" | "deprecated";
  tags: string[];
  sections: Sections;
};

const SECTION_KEYS: (keyof Sections)[] = ["features", "improvements", "fixes", "breaking"];

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
};

export function ChangelogBlockFields({ block, onChange }: Props) {
  const releases = (block.props.releases as Release[]) ?? [];

  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  const updateReleases = (next: Release[]) => setProp("releases", next);

  const updateRelease = (id: string, patch: Partial<Release>) => {
    updateReleases(releases.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addSectionEntry = (releaseId: string, section: keyof Sections) => {
    updateReleases(
      releases.map((r) => {
        if (r.id !== releaseId) return r;
        return {
          ...r,
          sections: {
            ...r.sections,
            [section]: [...r.sections[section], { id: newId("e"), ...emptyLocalizedItemFields(["text"]) }],
          },
        };
      })
    );
  };

  const useReleaseSet = Boolean((block.props.releaseSetSlug as string)?.trim());

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <Input
        placeholder="Release set slug (CMS)"
        value={(block.props.releaseSetSlug as string) ?? ""}
        onChange={(e) => setProp("releaseSetSlug", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Layout</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.layout as string) ?? "timeline"}
            onChange={(e) => setProp("layout", e.target.value)}
          >
            <option value="timeline">Timeline</option>
            <option value="list">List</option>
          </select>
        </div>
      </div>
      <Input
        placeholder="Filter tags (comma-separated)"
        value={((block.props.filterTags as string[]) ?? []).join(", ")}
        onChange={(e) =>
          setProp(
            "filterTags",
            e.target.value
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          )
        }
      />
      <Input
        placeholder="Filter statuses (released,beta,deprecated)"
        value={((block.props.filterStatuses as string[]) ?? []).join(", ")}
        onChange={(e) =>
          setProp(
            "filterStatuses",
            e.target.value
              .split(",")
              .map((t) => t.trim())
              .filter((t): t is Release["status"] =>
                ["released", "beta", "deprecated"].includes(t)
              )
          )
        }
      />
      {!useReleaseSet && (
      <RepeatableSection
        label="Manual releases"
        onAdd={() =>
          updateReleases([
            ...releases,
            {
              id: newId("rel"),
              version: "1.0.0",
              date: new Date().toISOString().slice(0, 10),
              status: "released",
              tags: [],
              sections: { features: [], improvements: [], fixes: [], breaking: [] },
            },
          ])
        }
      >
        {releases.map((release) => (
          <ItemCard key={release.id} onRemove={() => updateReleases(releases.filter((r) => r.id !== release.id))}>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Version"
                value={release.version}
                onChange={(e) => updateRelease(release.id, { version: e.target.value })}
              />
              <Input
                type="date"
                value={release.date}
                onChange={(e) => updateRelease(release.id, { date: e.target.value })}
              />
            </div>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm"
              value={release.status}
              onChange={(e) =>
                updateRelease(release.id, { status: e.target.value as Release["status"] })
              }
            >
              <option value="released">Released</option>
              <option value="beta">Beta</option>
              <option value="deprecated">Deprecated</option>
            </select>
            {SECTION_KEYS.map((sectionKey) => (
              <div key={sectionKey} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs capitalize">{sectionKey}</Label>
                  <button
                    type="button"
                    className="text-xs text-primary"
                    onClick={() => addSectionEntry(release.id, sectionKey)}
                  >
                    + Add
                  </button>
                </div>
                {release.sections[sectionKey].map((entry) => (
                  <div key={entry.id} className="flex gap-1 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <LocalizedItemFields
                        fields={[{ key: "text", label: "Item" }]}
                        values={entry}
                        onChange={(patch) =>
                          updateReleases(
                            releases.map((r) => {
                              if (r.id !== release.id) return r;
                              return {
                                ...r,
                                sections: {
                                  ...r.sections,
                                  [sectionKey]: r.sections[sectionKey].map((en) =>
                                    en.id === entry.id ? { ...en, ...patch } : en
                                  ),
                                },
                              };
                            })
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="text-xs text-destructive px-2"
                      onClick={() =>
                        updateReleases(
                          releases.map((r) => {
                            if (r.id !== release.id) return r;
                            return {
                              ...r,
                              sections: {
                                ...r.sections,
                                [sectionKey]: r.sections[sectionKey].filter((en) => en.id !== entry.id),
                              },
                            };
                          })
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </ItemCard>
        ))}
      </RepeatableSection>
      )}
      {useReleaseSet && (
        <p className="text-xs text-muted-foreground">
          Releases are loaded from the linked release set. Clear the slug above to edit manual releases.
        </p>
      )}
    </div>
  );
}
