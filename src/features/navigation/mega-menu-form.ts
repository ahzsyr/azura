import type { MegaMenuContentConfig, MegaMenuTabConfig, MenuItem } from "./types";
import { generateId } from "./menu-engine";

export function clampMegaColumns(n: number): number {
  return Math.min(4, Math.max(2, Math.round(Number(n)) || 3));
}

export interface MegaMenuFormState {
  gridColumns: number;
  columnCount: number;
  mixedLeftTitle: string;
  mixedLeftBody: string;
  mixedLeftIcon: string;
  mixedRightTitle: string;
  mixedRightBody: string;
  mixedRightIcon: string;
  dropdownShowIcons: boolean;
  tabs: MegaMenuTabConfig[];
  childDescriptions: Record<string, string>;
}

export function initMegaFormState(item: MenuItem | null): MegaMenuFormState {
  const m = item?.megaMenu;
  const tabs = m?.tabs?.length
    ? m.tabs.map((t) => ({ ...t, childIds: [...t.childIds] }))
    : [{ id: generateId(), label: "Featured", childIds: [] as string[] }];

  return {
    gridColumns: clampMegaColumns(m?.gridColumns ?? 3),
    columnCount: clampMegaColumns(m?.columnCount ?? 3),
    mixedLeftTitle: m?.mixed?.left?.title ?? "",
    mixedLeftBody: m?.mixed?.left?.body ?? "",
    mixedLeftIcon: m?.mixed?.left?.icon ?? "",
    mixedRightTitle: m?.mixed?.right?.title ?? "",
    mixedRightBody: m?.mixed?.right?.body ?? "",
    mixedRightIcon: m?.mixed?.right?.icon ?? "",
    dropdownShowIcons: m?.dropdownShowIcons !== false,
    tabs,
    childDescriptions: m?.childDescriptions ? { ...m.childDescriptions } : {},
  };
}

export function megaFormToPersistedConfig(form: MegaMenuFormState): MegaMenuContentConfig | undefined {
  const out: MegaMenuContentConfig = {};
  const gc = clampMegaColumns(form.gridColumns);
  const cc = clampMegaColumns(form.columnCount);
  if (gc !== 3) out.gridColumns = gc;
  if (cc !== 3) out.columnCount = cc;

  const lTitle = form.mixedLeftTitle.trim();
  const lBody = form.mixedLeftBody.trim();
  const lIcon = form.mixedLeftIcon.trim();
  const rTitle = form.mixedRightTitle.trim();
  const rBody = form.mixedRightBody.trim();
  const rIcon = form.mixedRightIcon.trim();
  if (lTitle || lBody || lIcon || rTitle || rBody || rIcon) {
    out.mixed = {};
    if (lTitle || lBody || lIcon) out.mixed.left = { title: lTitle, body: lBody, icon: lIcon };
    if (rTitle || rBody || rIcon) out.mixed.right = { title: rTitle, body: rBody, icon: rIcon };
  }

  const tabs = form.tabs.filter((t) => t.label.trim() || t.childIds.length);
  if (tabs.length) {
    out.tabs = tabs.map((t) => ({
      ...t,
      label: t.label.trim() || "Tab",
      childIds: [...t.childIds],
    }));
  }

  if (form.dropdownShowIcons === false) out.dropdownShowIcons = false;

  const desc: Record<string, string> = {};
  for (const [id, text] of Object.entries(form.childDescriptions)) {
    if (text?.trim()) desc[id] = text.trim();
  }
  if (Object.keys(desc).length) out.childDescriptions = desc;

  if (Object.keys(out).length === 0) return undefined;
  return out;
}

export function assignChildToTabExclusive(
  tabs: MegaMenuTabConfig[],
  tabIdx: number,
  childId: string,
  checked: boolean
): MegaMenuTabConfig[] {
  if (!checked) {
    return tabs.map((t, i) =>
      i === tabIdx ? { ...t, childIds: t.childIds.filter((id) => id !== childId) } : t
    );
  }
  return tabs.map((t, i) => ({
    ...t,
    childIds:
      i === tabIdx
        ? [...t.childIds.filter((id) => id !== childId), childId]
        : t.childIds.filter((id) => id !== childId),
  }));
}
