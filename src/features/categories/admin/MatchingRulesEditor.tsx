"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyRuleGroup,
  fieldKind,
  isMultiValueOperator,
  isRuleGroup,
  isUnaryOperator,
  operatorsForField,
  buildMatchingRuleFieldGroups,
  type MatchingRuleOperator,
  type RuleGroup,
  type RuleLeaf,
  type RuleNode,
} from "@/features/categories/matching";
import "./MatchingRulesEditor.css";

const MAX_DEPTH = 3;

type PreviewSample = {
  id: string;
  slug: string;
  name: string;
  matched: boolean;
  explain?: Array<{ path: string; field?: string; operator?: string; passed: boolean; detail?: string }>;
};

type PreviewResult = {
  count: number;
  totalScanned: number;
  samples: PreviewSample[];
};

function emptyLeaf(): RuleLeaf {
  return {
    kind: "leaf",
    field: "brand",
    operator: "contains",
    value: "",
  };
}

function cloneGroup(group: RuleGroup): RuleGroup {
  return {
    kind: "group",
    match: group.match === "all" ? "all" : "any",
    children: (group.children ?? []).map((child) =>
      isRuleGroup(child)
        ? cloneGroup(child)
        : {
            kind: "leaf" as const,
            field: child.field,
            operator: child.operator,
            value: child.value,
            values: child.values ? [...child.values] : undefined,
          },
    ),
  };
}

function ensureOperatorForField(leaf: RuleLeaf): RuleLeaf {
  const ops = operatorsForField(leaf.field);
  if (ops.includes(leaf.operator)) return leaf;
  return { ...leaf, operator: ops[0] ?? "equals" };
}

function parseMultiValues(raw: string): Array<string | number> {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      return Number.isFinite(n) && s !== "" && /^-?\d+(\.\d+)?$/.test(s) ? n : s;
    });
}

function multiValuesToString(leaf: RuleLeaf): string {
  if (leaf.values?.length) return leaf.values.map(String).join(", ");
  if (leaf.value != null && String(leaf.value) !== "") return String(leaf.value);
  return "";
}

type MatchingRulesEditorProps = {
  value: RuleGroup;
  onChange: (next: RuleGroup) => void;
  locale?: string;
};

export function MatchingRulesEditor({
  value,
  onChange,
  locale = "en-us",
}: MatchingRulesEditorProps) {
  const root = value?.children ? value : emptyRuleGroup("any");

  const setRoot = useCallback(
    (next: RuleGroup) => {
      onChange(cloneGroup(next));
    },
    [onChange],
  );

  return (
    <div className="mre">
      <div className="mre-header">
        <span className="mre-label">Matching Rules</span>
        <div className="mre-match">
          <label className="mre-check">
            <input
              type="radio"
              name="mre-root-match"
              checked={root.match !== "all"}
              onChange={() => setRoot({ ...root, match: "any" })}
            />
            Match ANY (OR)
          </label>
          <label className="mre-check">
            <input
              type="radio"
              name="mre-root-match"
              checked={root.match === "all"}
              onChange={() => setRoot({ ...root, match: "all" })}
            />
            Match ALL (AND)
          </label>
        </div>
      </div>

      <RuleGroupEditor group={root} depth={0} onChange={setRoot} showHeader={false} locale={locale} />

      <MatchPreviewPanel conditions={root} locale={locale} />
    </div>
  );
}

function RuleGroupEditor({
  group,
  depth,
  onChange,
  onRemove,
  showHeader,
  pathLabel,
  locale,
}: {
  group: RuleGroup;
  depth: number;
  onChange: (next: RuleGroup) => void;
  onRemove?: () => void;
  showHeader: boolean;
  pathLabel?: string;
  locale: string;
}) {
  const updateChild = (index: number, child: RuleNode) => {
    const children = [...group.children];
    children[index] = child;
    onChange({ ...group, children });
  };

  const removeChild = (index: number) => {
    onChange({ ...group, children: group.children.filter((_, i) => i !== index) });
  };

  const addLeaf = () => {
    onChange({ ...group, children: [...group.children, emptyLeaf()] });
  };

  const addGroup = () => {
    onChange({
      ...group,
      children: [...group.children, emptyRuleGroup(group.match)],
    });
  };

  const canNest = depth < MAX_DEPTH - 1;

  return (
    <div className={`mre-group ${depth > 0 ? "mre-group--nested" : ""}`}>
      {showHeader && (
        <div className="mre-group-header">
          <span className="mre-group-title">{pathLabel ?? "Group"}</span>
          <div className="mre-match">
            <label className="mre-check">
              <input
                type="radio"
                checked={group.match !== "all"}
                onChange={() => onChange({ ...group, match: "any" })}
              />
              ANY
            </label>
            <label className="mre-check">
              <input
                type="radio"
                checked={group.match === "all"}
                onChange={() => onChange({ ...group, match: "all" })}
              />
              ALL
            </label>
            {onRemove && (
              <button type="button" className="mre-btn mre-btn-icon mre-btn-danger" onClick={onRemove} title="Remove group">
                ×
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mre-rules">
        {group.children.map((child, i) =>
          isRuleGroup(child) ? (
            <RuleGroupEditor
              key={`g-${depth}-${i}`}
              group={child}
              depth={depth + 1}
              pathLabel={`Group ${i + 1}`}
              showHeader
              locale={locale}
              onChange={(next) => updateChild(i, next)}
              onRemove={() => removeChild(i)}
            />
          ) : (
            <LeafEditor
              key={`l-${depth}-${i}`}
              leaf={child}
              index={i}
              locale={locale}
              onChange={(next) => updateChild(i, next)}
              onRemove={() => removeChild(i)}
            />
          ),
        )}
      </div>

      <div className="mre-actions">
        <button type="button" className="mre-btn" onClick={addLeaf}>
          + Add Rule
        </button>
        <button type="button" className="mre-btn" onClick={addGroup} disabled={!canNest}>
          + Add Group
        </button>
      </div>
    </div>
  );
}

function RuleValueCombobox({
  field,
  locale,
  value,
  placeholder,
  multi,
  onChange,
}: {
  field: string;
  locale: string;
  value: string;
  placeholder: string;
  multi?: boolean;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const queryForFetch = (() => {
    if (!multi) return value;
    const parts = value.split(",");
    return (parts[parts.length - 1] ?? "").trim();
  })();

  useEffect(() => {
    if (!open || !field) return;
    const id = ++seq.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          field,
          locale,
          q: queryForFetch,
        });
        const res = await fetch(`/api/categories/field-values?${params}`, {
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as {
          values?: string[];
        };
        if (id !== seq.current) return;
        setSuggestions(Array.isArray(data.values) ? data.values : []);
        setActiveIndex(0);
      } catch {
        if (id !== seq.current) return;
        setSuggestions([]);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, field, locale, queryForFetch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const applySuggestion = (suggestion: string) => {
    if (!multi) {
      onChange(suggestion);
      setOpen(false);
      return;
    }
    const parts = value.split(",").map((s) => s.trim());
    if (parts.length === 0) {
      onChange(suggestion);
    } else {
      parts[parts.length - 1] = suggestion;
      onChange(parts.filter(Boolean).join(", "));
    }
    setOpen(false);
  };

  return (
    <div className="mre-combo" ref={wrapRef}>
      <input
        className="mre-input mre-val"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            applySuggestion(suggestions[activeIndex] ?? suggestions[0]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
      />
      {open && (
        <ul className="mre-combo-list" role="listbox">
          {loading && <li className="mre-combo-empty">Searching…</li>}
          {!loading && suggestions.length === 0 && (
            <li className="mre-combo-empty">No catalog suggestions</li>
          )}
          {!loading &&
            suggestions.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  className={`mre-combo-item ${i === activeIndex ? "is-active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySuggestion(s);
                  }}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  {s}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function LeafEditor({
  leaf,
  index,
  locale,
  onChange,
  onRemove,
}: {
  leaf: RuleLeaf;
  index: number;
  locale: string;
  onChange: (next: RuleLeaf) => void;
  onRemove: () => void;
}) {
  const ops = operatorsForField(leaf.field);
  const kind = fieldKind(leaf.field);
  const unary = isUnaryOperator(leaf.operator);
  const multi = isMultiValueOperator(leaf.operator);
  const fieldGroups = buildMatchingRuleFieldGroups();

  const setField = (value: string) => {
    onChange(ensureOperatorForField({ ...leaf, field: value }));
  };

  const setOperator = (operator: MatchingRuleOperator) => {
    const next: RuleLeaf = { ...leaf, operator };
    if (isUnaryOperator(operator)) {
      delete next.value;
      delete next.values;
    } else if (isMultiValueOperator(operator)) {
      if (!next.values?.length && next.value != null) {
        next.values = [next.value as string | number | boolean];
      }
    }
    onChange(next);
  };

  return (
    <div className="mre-row">
      <span className="mre-num">{index + 1}</span>
      <select
        className="mre-select mre-field"
        value={leaf.field}
        onChange={(e) => setField(e.target.value)}
        aria-label="Rule field"
      >
        {fieldGroups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
        {leaf.field.startsWith("spec:") &&
        !fieldGroups.some((g) => g.options.some((o) => o.value === leaf.field)) ? (
          <optgroup label="Legacy specification key">
            <option value={leaf.field}>{leaf.field.replace(/^spec:/, "")}</option>
          </optgroup>
        ) : null}
      </select>

      <select
        className="mre-select mre-op"
        value={leaf.operator}
        onChange={(e) => setOperator(e.target.value as MatchingRuleOperator)}
      >
        {ops.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>

      {!unary && multi && leaf.operator === "between" && (
        <div className="mre-val--pair">
          <input
            className="mre-input"
            type="number"
            placeholder="min"
            value={leaf.values?.[0] == null ? "" : String(leaf.values[0])}
            onChange={(e) => {
              const a = e.target.value === "" ? "" : Number(e.target.value);
              const b = leaf.values?.[1] ?? "";
              onChange({
                ...leaf,
                values: [a === "" ? 0 : a, typeof b === "number" ? b : Number(b) || 0],
                value: undefined,
              });
            }}
          />
          <input
            className="mre-input"
            type="number"
            placeholder="max"
            value={leaf.values?.[1] == null ? "" : String(leaf.values[1])}
            onChange={(e) => {
              const b = e.target.value === "" ? "" : Number(e.target.value);
              const a = leaf.values?.[0] ?? 0;
              onChange({
                ...leaf,
                values: [typeof a === "number" ? a : Number(a) || 0, b === "" ? 0 : b],
                value: undefined,
              });
            }}
          />
        </div>
      )}

      {!unary && multi && leaf.operator !== "between" && (
        <RuleValueCombobox
          field={leaf.field}
          locale={locale}
          multi
          placeholder="search / comma-separated values"
          value={multiValuesToString(leaf)}
          onChange={(raw) =>
            onChange({
              ...leaf,
              values: parseMultiValues(raw),
              value: undefined,
            })
          }
        />
      )}

      {!unary && !multi && kind === "numeric" && (
        <input
          className="mre-input mre-val"
          type="number"
          placeholder="value"
          value={leaf.value == null ? "" : String(leaf.value)}
          onChange={(e) =>
            onChange({
              ...leaf,
              value: e.target.value === "" ? "" : Number(e.target.value),
              values: undefined,
            })
          }
        />
      )}

      {!unary && !multi && kind !== "numeric" && (
        <RuleValueCombobox
          field={leaf.field}
          locale={locale}
          placeholder="search matching value"
          value={leaf.value == null ? "" : String(leaf.value)}
          onChange={(raw) =>
            onChange({
              ...leaf,
              value: raw,
              values: undefined,
            })
          }
        />
      )}

      <button type="button" className="mre-btn mre-btn-icon mre-btn-danger" onClick={onRemove} title="Remove rule">
        ×
      </button>
    </div>
  );
}

function MatchPreviewPanel({ conditions, locale }: { conditions: RuleGroup; locale: string }) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explainSlug, setExplainSlug] = useState<string | null>(null);
  const seq = useRef(0);

  const conditionsKey = JSON.stringify(conditions);

  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    let parsed: RuleGroup = conditions;
    try {
      parsed = JSON.parse(conditionsKey) as RuleGroup;
    } catch {
      /* use conditions as-is */
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/categories/match-preview", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conditions: parsed,
            locale,
            sampleLimit: 15,
            explainEntityIdOrSlug: explainSlug ?? undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          preview?: PreviewResult;
          error?: string;
        };
        if (id !== seq.current) return;
        if (!res.ok) {
          setError(data.error ?? "Preview failed");
          setPreview(null);
          return;
        }
        setPreview(data.preview ?? null);
      } catch (e) {
        if (id !== seq.current) return;
        setError(e instanceof Error ? e.message : "Preview failed");
        setPreview(null);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [conditionsKey, locale, explainSlug, conditions]);

  const activeSample = preview?.samples.find((s) => s.slug === explainSlug);

  return (
    <div className="mre-preview">
      <div className="mre-preview-header">
        <span className="mre-label">Match preview</span>
        <span className="mre-preview-meta">
          {loading
            ? "Scanning…"
            : preview
              ? `${preview.count} match${preview.count === 1 ? "" : "es"} of ${preview.totalScanned}`
              : "—"}
        </span>
      </div>
      {error && <div className="mre-preview-error">{error}</div>}
      {preview && preview.samples.length > 0 && (
        <ul className="mre-preview-list">
          {preview.samples.map((s) => (
            <li key={s.slug}>
              <button
                type="button"
                className={`mre-preview-item ${explainSlug === s.slug ? "is-active" : ""}`}
                onClick={() => setExplainSlug(explainSlug === s.slug ? null : s.slug)}
              >
                {s.name || s.slug}
              </button>
            </li>
          ))}
        </ul>
      )}
      {activeSample?.explain && (
        <div className="mre-explain">
          {activeSample.explain.map((e, i) => (
            <div key={`${e.path}-${i}`} className={e.passed ? "is-pass" : "is-fail"}>
              {e.field ?? e.path}: {e.operator ?? ""} {e.detail ?? (e.passed ? "pass" : "fail")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
