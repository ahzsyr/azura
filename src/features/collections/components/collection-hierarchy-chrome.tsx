import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  collectionMapFromList,
  getChildCollections,
  getRootCollections,
  parseCollectionScopePath,
} from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import "@/styles/collection-hierarchy-chrome.css";

function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export interface CollectionHierarchyChromeLabels {
  allCollections: string;
  ariaLabel: string;
  levelRoot: string;
  levelUnder: string;
}

export interface HierarchyCollectionItem {
  slug: string;
  name: string;
  parentSlug?: string;
  visible?: boolean;
}

interface Props {
  collections: HierarchyCollectionItem[];
  value: string | null;
  onChange: (slug: string | null) => void;
  labels: CollectionHierarchyChromeLabels;
  dir?: "ltr" | "rtl";
  variant?: "select" | "tabs" | "chrome" | "sidebar";
  /** When true, include collections with visible=false (admin use). */
  includeHidden?: boolean;
}

interface ChromeTab {
  key: string;
  slug: string | null;
  label: string;
  active: boolean;
  kind: "all" | "path" | "sibling";
}

function toLocalized(items: HierarchyCollectionItem[]): Collection[] {
  return items.map((c) => ({
    slug: c.slug,
    name: c.name,
    parentSlug: c.parentSlug,
    id: c.slug,
    description: "",
    visible: c.visible !== false,
    conditions: { match: "any" as const, rules: [] },
  }));
}

export function CollectionHierarchyChrome({
  collections,
  value,
  onChange,
  labels,
  dir = "ltr",
  variant = "tabs",
  includeHidden = false,
}: Props) {
  const all = useMemo(
    () =>
      includeHidden
        ? toLocalized(collections)
        : toLocalized(collections).filter((c) => c.visible !== false),
    [collections, includeHidden],
  );
  const bySlug = useMemo(() => collectionMapFromList(all), [all]);

  const navOpts = useMemo(() => ({ includeHidden }), [includeHidden]);

  const pathSlugs = useMemo(() => {
    if (!value?.trim()) return [];
    return parseCollectionScopePath(value, bySlug);
  }, [value, bySlug]);

  const selectCount = useMemo(() => {
    if (!pathSlugs.length) return 1;
    const leaf = pathSlugs[pathSlugs.length - 1]!;
    const hasMore = getChildCollections(leaf, all, navOpts).length > 0;
    return pathSlugs.length + (hasMore ? 1 : 0);
  }, [pathSlugs, all, navOpts]);

  const levels = useMemo(() => {
    const out: { options: Collection[]; selected: string }[] = [];
    for (let i = 0; i < selectCount; i++) {
      const parentSlug = i === 0 ? "" : pathSlugs[i - 1] ?? "";
      const options = i === 0 ? getRootCollections(all, navOpts) : getChildCollections(parentSlug, all, navOpts);
      const selected = pathSlugs[i] ?? "";
      out.push({ options, selected });
    }
    return out;
  }, [selectCount, pathSlugs, all, navOpts]);

  const handleLevelChange = (levelIndex: number, nextSlug: string) => {
    if (!nextSlug) {
      if (levelIndex === 0) {
        onChange(null);
        return;
      }
      onChange(pathSlugs[levelIndex - 1] ?? null);
      return;
    }
    onChange(nextSlug);
  };

  const formatLevelUnder = (parentName: string) => {
    const template =
      typeof labels.levelUnder === "string" ? labels.levelUnder : "Under {parent}";
    return template.replace("{parent}", parentName);
  };

  const levelAria = (parentName?: string) =>
    parentName ? formatLevelUnder(parentName) : labels.levelRoot;

  const cascadeSelects = (layout: "select" | "sidebar") => (
    <div
      className={
        layout === "sidebar"
          ? "col-hierarchy-chrome__stack"
          : "col-hierarchy-chrome__row"
      }
    >
      {levels.map((level, i) => {
        const parentName = i > 0 ? bySlug.get(pathSlugs[i - 1] ?? "")?.name : undefined;
        if (layout === "sidebar" && i > 0 && !pathSlugs[i - 1]) return null;
        return (
          <label key={i} className="col-hierarchy-chrome__field">
            <span className="col-hierarchy-chrome__label">{levelAria(parentName)}</span>
            <select
              className="col-hierarchy-chrome__select"
              value={level.selected}
              aria-label={levelAria(parentName)}
              onChange={(e) => handleLevelChange(i, e.target.value)}
            >
              <option value="">{i === 0 ? labels.allCollections : "—"}</option>
              {level.options.map((opt) => (
                <option key={opt.slug} value={opt.slug}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );

  const chromeTabs = useMemo((): ChromeTab[] => {
    const tabs: ChromeTab[] = [
      {
        key: "all",
        slug: null,
        label: labels.allCollections,
        active: !value?.trim(),
        kind: "all",
      },
    ];
    for (let i = 0; i < pathSlugs.length; i++) {
      const slug = pathSlugs[i]!;
      const col = bySlug.get(slug);
      if (!col) continue;
      tabs.push({
        key: `path-${slug}`,
        slug,
        label: col.name,
        active: i === pathSlugs.length - 1,
        kind: "path",
      });
    }
    const leaf = pathSlugs.length ? pathSlugs[pathSlugs.length - 1]! : "";
    const siblings = leaf ? getChildCollections(leaf, all, navOpts) : getRootCollections(all, navOpts);
    for (const sib of siblings) {
      tabs.push({
        key: `sib-${sib.slug}`,
        slug: sib.slug,
        label: sib.name,
        active: false,
        kind: "sibling",
      });
    }
    return tabs;
  }, [all, bySlug, labels.allCollections, navOpts, pathSlugs, value]);

  const [menuOpen, setMenuOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const onChromeTab = (tab: ChromeTab) => {
    onChange(tab.slug);
    setMenuOpen(false);
  };

  const onChromeKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const tabs = chromeTabs;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = tabs[Math.min(index + 1, tabs.length - 1)];
      if (next) onChromeTab(next);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = tabs[Math.max(index - 1, 0)];
      if (prev) onChromeTab(prev);
    }
  };

  if (all.length === 0) return null;

  if (variant === "chrome") {
    const roots = getRootCollections(all, navOpts);
    return (
      <nav
        className="col-hierarchy-chrome col-hierarchy-chrome--chrome"
        aria-label={labels.ariaLabel}
        dir={dir}
      >
        <span className="col-hierarchy-chrome__edge col-hierarchy-chrome__edge--start" aria-hidden="true" />
        <div className="col-hierarchy-chrome__track" ref={trackRef} role="tablist">
          <div className="col-hierarchy-chrome__menu-wrap">
            <button
              type="button"
              className={`col-hierarchy-chrome__tab col-hierarchy-chrome__tab--menu${menuOpen ? " col-hierarchy-chrome__tab--active" : ""}`}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {labels.allCollections}
              <span className="col-hierarchy-chrome__menu-caret" aria-hidden="true">
                <IconChevronDown />
              </span>
            </button>
            {menuOpen ? (
              <ul className="col-hierarchy-chrome__menu" role="listbox">
                <li role="option">
                  <button type="button" onClick={() => onChromeTab(chromeTabs[0]!)}>
                    {labels.allCollections}
                  </button>
                </li>
                {roots.map((r) => (
                  <li key={r.slug} role="option">
                    <button type="button" onClick={() => onChange(r.slug)}>
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {chromeTabs.slice(1).map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              className={`col-hierarchy-chrome__tab${tab.active ? " col-hierarchy-chrome__tab--active" : ""}${tab.kind === "sibling" ? " col-hierarchy-chrome__tab--sibling" : ""}`}
              aria-selected={tab.active}
              onClick={() => onChromeTab(tab)}
              onKeyDown={(e) => onChromeKeyDown(e, i + 1)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="col-hierarchy-chrome__edge col-hierarchy-chrome__edge--end" aria-hidden="true" />
      </nav>
    );
  }

  if (variant === "sidebar") {
    return (
      <nav
        className="col-hierarchy-chrome col-hierarchy-chrome--sidebar"
        aria-label={labels.ariaLabel}
        dir={dir}
      >
        {cascadeSelects("sidebar")}
      </nav>
    );
  }

  if (variant === "select") {
    return (
      <nav className="col-hierarchy-chrome col-hierarchy-chrome--select" aria-label={labels.ariaLabel} dir={dir}>
        {cascadeSelects("select")}
      </nav>
    );
  }

  return (
    <nav
      className="col-hierarchy-chrome col-hierarchy-chrome--tabs"
      aria-label={labels.ariaLabel}
      dir={dir}
    >
      <span className="col-hierarchy-chrome__edge col-hierarchy-chrome__edge--start" aria-hidden="true" />
      <div className="col-hierarchy-chrome__track">
        {levels.map((level, i) => (
          <div className="col-hierarchy-chrome__segment" key={i} role="group" aria-label={i === 0 ? labels.levelRoot : formatLevelUnder(bySlug.get(pathSlugs[i - 1] ?? "")?.name ?? "")}>
            {i > 0 ? (
              <span className="col-hierarchy-chrome__divider" aria-hidden="true">
                /
              </span>
            ) : null}
            <button
              type="button"
              className={`col-hierarchy-chrome__pill${!level.selected && i === 0 ? " col-hierarchy-chrome__pill--active" : ""}`}
              onClick={() => handleLevelChange(i, "")}
              aria-pressed={!level.selected && i === 0}
            >
              {i === 0 ? labels.allCollections : "—"}
            </button>
            {level.options.map((opt) => {
              const active = level.selected === opt.slug;
              return (
                <button
                  key={opt.slug}
                  type="button"
                  className={`col-hierarchy-chrome__pill${active ? " col-hierarchy-chrome__pill--active" : ""}`}
                  onClick={() => handleLevelChange(i, opt.slug)}
                  aria-pressed={active}
                >
                  {opt.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <span className="col-hierarchy-chrome__edge col-hierarchy-chrome__edge--end" aria-hidden="true" />
    </nav>
  );
}
