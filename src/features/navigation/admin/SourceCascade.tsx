"use client";

import { useEffect, useMemo, useState } from "react";
import type { HeaderBuilderCatalog, MenuItem, MenuItemType } from "@/features/navigation/types";
import {
  childCollections,
  cleanLabel,
  collectionAncestorPath,
  findLeafNode,
  hydrateSourcePath,
  optionsForLeaf,
  resolveSourceTarget,
  rootCollections,
  type SourceTarget,
} from "@/features/navigation/source-families";
import { HeaderField, HeaderSelect } from "./header-builder-ui";
import { SearchableCatalogSelect } from "./CatalogSelects";

export type SourceCascadeValue = SourceTarget & {
  sectionId: string;
  typeId: string;
  /** Collection path when leaf is collections (root → … → leaf). */
  collectionPath: string[];
};

type Props = {
  catalog: HeaderBuilderCatalog;
  idPrefix: string;
  /** When provided, hydrates cascade from an existing menu item. */
  editingItem?: MenuItem | null;
  onChange: (next: SourceCascadeValue | null) => void;
};

function ensureOption(
  opts: { value: string; label: string }[],
  value: string,
): { value: string; label: string }[] {
  if (value && !opts.some((o) => o.value === value)) {
    return [{ value, label: `${value} (custom)` }, ...opts];
  }
  return opts;
}

export function PageSourceCascade({ catalog, idPrefix, editingItem, onChange }: Props) {
  const families = catalog.sourceFamilies;
  const [sectionId, setSectionId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [value, setValue] = useState("");
  const [collectionPath, setCollectionPath] = useState<string[]>([]);

  const section = families.find((s) => s.id === sectionId);
  const typeOptions = section?.children ?? [];
  const leaf = findLeafNode(families, sectionId, typeId);

  useEffect(() => {
    if (!editingItem) return;
    const hydrated = hydrateSourcePath(catalog, editingItem);
    if (!hydrated) return;
    setSectionId(hydrated.sectionId);
    setTypeId(hydrated.typeId);
    setValue(hydrated.value);
    setCollectionPath(hydrated.collectionPath ?? []);
  }, [editingItem, catalog]);

  const itemOptions = useMemo(() => {
    if (!leaf) return [];
    if (leaf.leafKind === "collections") {
      // First level shown separately via collectionPath; options for "pick root" used when path empty
      return ensureOption(
        rootCollections(catalog).map((c) => ({ value: c.slug, label: c.name })),
        collectionPath[0] ?? value,
      );
    }
    return ensureOption(optionsForLeaf(catalog, leaf), value);
  }, [catalog, leaf, value, collectionPath]);

  const emit = (
    nextSection: string,
    nextType: string,
    nextValue: string,
    nextColPath: string[],
  ) => {
    const nextLeaf = findLeafNode(families, nextSection, nextType);
    if (!nextLeaf || !nextValue) {
      onChange(null);
      return;
    }
    if (nextLeaf.leafKind === "collections") {
      const deepest = nextColPath[nextColPath.length - 1] ?? nextValue;
      const target = resolveSourceTarget(catalog, nextLeaf, deepest);
      if (!target) {
        onChange(null);
        return;
      }
      onChange({
        ...target,
        label: cleanLabel(target.label),
        sectionId: nextSection,
        typeId: nextType,
        collectionPath: nextColPath.length ? nextColPath : [deepest],
      });
      return;
    }
    const target = resolveSourceTarget(catalog, nextLeaf, nextValue);
    if (!target) {
      onChange(null);
      return;
    }
    onChange({
      ...target,
      label: cleanLabel(target.label),
      sectionId: nextSection,
      typeId: nextType,
      collectionPath: [],
    });
  };

  const onSectionChange = (next: string) => {
    setSectionId(next);
    setTypeId("");
    setValue("");
    setCollectionPath([]);
    onChange(null);
  };

  const onTypeChange = (next: string) => {
    setTypeId(next);
    setValue("");
    setCollectionPath([]);
    const nextLeaf = findLeafNode(families, sectionId, next);
    if (nextLeaf?.leafKind === "collections") {
      const roots = rootCollections(catalog);
      const first = roots[0]?.slug ?? "";
      setCollectionPath(first ? [first] : []);
      setValue(first);
      emit(sectionId, next, first, first ? [first] : []);
      return;
    }
    const opts = nextLeaf ? optionsForLeaf(catalog, nextLeaf) : [];
    const first = opts[0]?.value ?? "";
    setValue(first);
    emit(sectionId, next, first, []);
  };

  const onItemChange = (next: string) => {
    setValue(next);
    if (leaf?.leafKind === "collections") {
      const path = [next];
      setCollectionPath(path);
      emit(sectionId, typeId, next, path);
      return;
    }
    emit(sectionId, typeId, next, []);
  };

  const onCollectionLevelChange = (level: number, nextSlug: string) => {
    const nextPath = [...collectionPath.slice(0, level), nextSlug];
    setCollectionPath(nextPath);
    setValue(nextSlug);
    emit(sectionId, typeId, nextSlug, nextPath);
  };

  const collectionLevels = useMemo(() => {
    if (leaf?.leafKind !== "collections") return [];
    const levels: { level: number; options: { value: string; label: string }[]; value: string }[] =
      [];
    // Level 0: roots
    const path = collectionPath.length
      ? collectionPath
      : value
        ? collectionAncestorPath(catalog, value)
        : [];
    const rootOpts = ensureOption(
      rootCollections(catalog).map((c) => ({ value: c.slug, label: c.name })),
      path[0] ?? "",
    );
    levels.push({ level: 0, options: rootOpts, value: path[0] ?? "" });

    for (let i = 0; i < path.length; i++) {
      const children = childCollections(catalog, path[i]);
      if (!children.length) break;
      const childVal = path[i + 1] ?? "";
      levels.push({
        level: i + 1,
        options: ensureOption(
          children.map((c) => ({ value: c.slug, label: c.name })),
          childVal,
        ),
        value: childVal,
      });
      if (!childVal) break;
    }
    return levels;
  }, [catalog, leaf, collectionPath, value]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
      <HeaderField label="Content section" htmlFor={`${idPrefix}-section`}>
        <HeaderSelect
          id={`${idPrefix}-section`}
          value={sectionId}
          onChange={onSectionChange}
        >
          <option value="">Select section…</option>
          {families.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </HeaderSelect>
      </HeaderField>

      {sectionId ? (
        <HeaderField label="Content type" htmlFor={`${idPrefix}-type`}>
          <HeaderSelect id={`${idPrefix}-type`} value={typeId} onChange={onTypeChange}>
            <option value="">Select type…</option>
            {typeOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </HeaderSelect>
        </HeaderField>
      ) : null}

      {typeId && leaf?.leafKind === "collections"
        ? collectionLevels.map((lvl) => (
            <HeaderField
              key={`col-${lvl.level}`}
              label={lvl.level === 0 ? "Collection" : `Sub-collection (level ${lvl.level})`}
              htmlFor={`${idPrefix}-col-${lvl.level}`}
              hint={
                lvl.level > 0 && !lvl.value
                  ? "Optional — leave empty to link the parent collection."
                  : undefined
              }
            >
              <SearchableCatalogSelect
                id={`${idPrefix}-col-${lvl.level}`}
                options={
                  lvl.level === 0
                    ? lvl.options
                    : [{ value: "", label: "(use parent)" }, ...lvl.options]
                }
                value={lvl.value}
                onChange={(next) => {
                  if (!next && lvl.level > 0) {
                    const trimmed = collectionPath.slice(0, lvl.level);
                    setCollectionPath(trimmed);
                    const deepest = trimmed[trimmed.length - 1] ?? "";
                    setValue(deepest);
                    emit(sectionId, typeId, deepest, trimmed);
                    return;
                  }
                  onCollectionLevelChange(lvl.level, next);
                }}
                emptyMessage="No collections"
              />
            </HeaderField>
          ))
        : null}

      {typeId && leaf && leaf.leafKind !== "collections" ? (
        <HeaderField
          label="Item"
          htmlFor={`${idPrefix}-item`}
          hint="Pick the specific page or content item for this menu link."
        >
          <SearchableCatalogSelect
            id={`${idPrefix}-item`}
            options={itemOptions}
            value={value}
            onChange={onItemChange}
            emptyMessage="No items"
          />
        </HeaderField>
      ) : null}
    </div>
  );
}

export function CollectionSourceCascade({
  catalog,
  idPrefix,
  value,
  onChange,
}: {
  catalog: HeaderBuilderCatalog;
  idPrefix: string;
  value: string;
  onChange: (slug: string, label: string) => void;
}) {
  const initialPath = useMemo(
    () => (value ? collectionAncestorPath(catalog, value) : []),
    // Only seed from value when catalog identity changes or value changes externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, catalog.collections],
  );
  const [path, setPath] = useState<string[]>(initialPath);

  useEffect(() => {
    setPath(value ? collectionAncestorPath(catalog, value) : []);
  }, [value, catalog]);

  const levels = useMemo(() => {
    const out: { level: number; options: { value: string; label: string }[]; value: string }[] =
      [];
    const rootOpts = ensureOption(
      rootCollections(catalog).map((c) => ({ value: c.slug, label: c.name })),
      path[0] ?? "",
    );
    out.push({ level: 0, options: rootOpts, value: path[0] ?? "" });
    for (let i = 0; i < path.length; i++) {
      const children = childCollections(catalog, path[i]);
      if (!children.length) break;
      const childVal = path[i + 1] ?? "";
      out.push({
        level: i + 1,
        options: ensureOption(
          children.map((c) => ({ value: c.slug, label: c.name })),
          childVal,
        ),
        value: childVal,
      });
      if (!childVal) break;
    }
    return out;
  }, [catalog, path]);

  const applyPath = (nextPath: string[]) => {
    setPath(nextPath);
    const deepest = nextPath[nextPath.length - 1] ?? "";
    const name =
      catalog.collections.find((c) => c.slug === deepest)?.name?.trim() || deepest || "Collection";
    onChange(deepest, name);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
      {levels.map((lvl) => (
        <HeaderField
          key={`cc-${lvl.level}`}
          label={lvl.level === 0 ? "Collection" : `Sub-collection (level ${lvl.level})`}
          htmlFor={`${idPrefix}-cc-${lvl.level}`}
        >
          <SearchableCatalogSelect
            id={`${idPrefix}-cc-${lvl.level}`}
            options={
              lvl.level === 0
                ? lvl.options
                : [{ value: "", label: "(use parent)" }, ...lvl.options]
            }
            value={lvl.value}
            onChange={(next) => {
              if (!next && lvl.level > 0) {
                applyPath(path.slice(0, lvl.level));
                return;
              }
              applyPath([...path.slice(0, lvl.level), next]);
            }}
            emptyMessage="No collections"
          />
        </HeaderField>
      ))}
    </div>
  );
}

/** Apply a cascade target onto form-like fields. */
export function applySourceTargetToFields(target: SourceTarget): {
  type: MenuItemType;
  label: string;
  url: string;
  pageId: string;
  postId: string;
  productId: string;
  packageId: string;
  collectionId: string;
  brandSlug: string;
  tagSlug: string;
} {
  return {
    type: target.type,
    label: cleanLabel(target.label),
    url: target.url ?? "/",
    pageId: target.pageId ?? "",
    postId: target.postId ?? "",
    productId: target.productId ?? "",
    packageId: target.packageId ?? "",
    collectionId: target.collectionId ?? "",
    brandSlug: target.brandSlug ?? "",
    tagSlug: target.tagSlug ?? "",
  };
}
