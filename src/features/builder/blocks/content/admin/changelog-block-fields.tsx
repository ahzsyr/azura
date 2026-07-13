"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { newId } from "@/features/builder/blocks/content/schemas/content-blocks";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";

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
      <ModalRepeatableListEditor
        items={releases}
        onChange={updateReleases}
        createEmpty={() => ({
          id: newId("rel"),
          version: "1.0.0",
          date: new Date().toISOString().slice(0, 10),
          status: "released",
          tags: [],
          sections: { features: [], improvements: [], fixes: [], breaking: [] },
        } as Release)}
        strings={{
          sectionLabel: "Manual releases",
          addButtonLabel: "Add release",
          emptyLabel: "No manual releases yet. Click Add release to create one.",
          dialogTitleCreate: "Add release",
          dialogTitleEdit: "Edit release",
          saveButtonLabelCreate: "Save release",
          saveButtonLabelEdit: "Save release",
        }}
        renderSummary={(release) => ({
          title: release.version || "Untitled release",
          meta: [release.date ? `Date: ${release.date}` : "", `Status: ${release.status}`].filter(Boolean),
        })}
        renderForm={(draft, onUpdate) => (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Version</Label>
                <Input
                  className="mt-1"
                  placeholder="Version"
                  value={draft.version}
                  onChange={(e) => onUpdate({ version: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  className="mt-1"
                  type="date"
                  value={draft.date}
                  onChange={(e) => onUpdate({ date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <select
                className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                value={draft.status}
                onChange={(e) => onUpdate({ status: e.target.value as Release["status"] })}
              >
                <option value="released">Released</option>
                <option value="beta">Beta</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
            {SECTION_KEYS.map((sectionKey) => (
              <ModalRepeatableListEditor
                key={sectionKey}
                items={draft.sections[sectionKey]}
                onChange={(next) =>
                  onUpdate({
                    sections: {
                      ...draft.sections,
                      [sectionKey]: next,
                    },
                  })
                }
                createEmpty={() => ({ id: newId("e"), ...emptyLocalizedItemFields(["text"]) })}
                strings={{
                  sectionLabel: sectionKey[0].toUpperCase() + sectionKey.slice(1),
                  addButtonLabel: "Add item",
                  emptyLabel: "No items yet.",
                  dialogTitleCreate: "Add item",
                  dialogTitleEdit: "Edit item",
                  saveButtonLabelCreate: "Save item",
                  saveButtonLabelEdit: "Save item",
                }}
                renderSummary={(entry, index) => ({
                  title:
                    (((entry as Record<string, string>).textEn as string | undefined) ?? "").trim() ||
                    `Item ${index + 1}`,
                  meta: [],
                })}
                renderForm={(entryDraft, onEntryUpdate) => (
                  <LocalizedItemFields
                    fields={[{ key: "text", label: "Item" }]}
                    values={entryDraft}
                    onChange={(patch) => onEntryUpdate(patch as Partial<Entry>)}
                  />
                )}
              />
            ))}
          </div>
        )}
      />
      )}
      {useReleaseSet && (
        <p className="text-xs text-muted-foreground">
          Releases are loaded from the linked release set. Clear the slug above to edit manual releases.
        </p>
      )}
    </div>
  );
}
