import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ProductCtaInternalLink, ProductInternalLinkKind } from "@/features/products/lib/product-cta";

const RECENTS_KEY = "azura-cta-internal-links-v1";
const RECENTS_MAX = 12;
const API = { credentials: "include" } as const;

export type StorefrontLinkResult = {
  kind: ProductInternalLinkKind;
  slug: string;
  label: string;
  path: string;
};

type RecentEntry = StorefrontLinkResult;

function loadRecents(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter(
      (x) =>
        x &&
        typeof x === "object" &&
        (x as RecentEntry).kind &&
        typeof (x as RecentEntry).slug === "string" &&
        typeof (x as RecentEntry).path === "string",
    ) as RecentEntry[];
  } catch {
    return [];
  }
}

function pushRecent(entry: StorefrontLinkResult) {
  const prev = loadRecents().filter((r) => !(r.kind === entry.kind && r.slug === entry.slug));
  const next = [entry, ...prev].slice(0, RECENTS_MAX);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type InternalLinkSelectorProps = {
  locale: string;
  linkType: "internal" | "external";
  internalPath: string;
  internalLink?: ProductCtaInternalLink;
  onPick: (path: string, ref: ProductCtaInternalLink) => void;
  onClear: () => void;
};

export function InternalLinkSelector({
  locale,
  linkType,
  internalPath,
  internalLink,
  onPick,
  onClear,
}: InternalLinkSelectorProps) {
  const listId = useId();
  const btnId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StorefrontLinkResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recents = useMemo(() => loadRecents(), [open]);

  const displayLabel = useMemo(() => {
    if (linkType !== "internal") return "";
    if (internalLink?.title) return internalLink.title;
    return internalPath || "—";
  }, [internalLink, internalPath, linkType]);

  const fetchResults = useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        const u = new URL("/api/admin/storefront-links", window.location.origin);
        u.searchParams.set("locale", locale);
        u.searchParams.set("q", query);
        u.searchParams.set("limit", "50");
        const res = await fetch(u.toString(), API);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const json = (await res.json()) as { results?: StorefrontLinkResult[] };
        setResults(Array.isArray(json.results) ? json.results : []);
        setActiveIdx(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (!open || linkType !== "internal") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchResults(q.trim());
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, q, linkType, fetchResults]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const flatList: StorefrontLinkResult[] = useMemo(() => {
    if (!open || linkType !== "internal") return [];
    const seen = new Set<string>();
    const out: StorefrontLinkResult[] = [];
    const qn = q.trim().toLowerCase();
    if (!qn) {
      for (const r of recents) {
        const k = `${r.kind}:${r.slug}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push(r);
        }
      }
    }
    for (const r of results) {
      const k = `${r.kind}:${r.slug}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(r);
      }
    }
    return out;
  }, [open, linkType, q, recents, results]);

  function applyPick(row: StorefrontLinkResult) {
    pushRecent(row);
    onPick(row.path.startsWith("/") ? row.path : `/${row.path}`, {
      kind: row.kind,
      slug: row.slug,
      title: row.label,
    });
    setOpen(false);
    setQ("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        void fetchResults(q.trim());
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, flatList.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatList[activeIdx]) {
      e.preventDefault();
      applyPick(flatList[activeIdx]);
    }
  }

  if (linkType !== "internal") {
    return null;
  }

  return (
    <div className="pm-ils" ref={wrapRef}>
      <div className="pm-ils__row">
        <button
          type="button"
          id={btnId}
          className="pm-ils__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setOpen((o) => !o);
            if (!open) {
              setTimeout(() => inputRef.current?.focus(), 0);
              void fetchResults(q.trim());
            }
          }}
        >
          <span className="pm-ils__trigger-label">{displayLabel}</span>
          <span className="pm-ils__trigger-meta">
            {internalLink ? (
              <>
                <span className="pm-ils__tag">{internalLink.kind}</span>
                <code className="pm-ils__path">{internalPath || "—"}</code>
              </>
            ) : (
              <code className="pm-ils__path">{internalPath || "—"}</code>
            )}
          </span>
          <span className="pm-ils__chev" aria-hidden>
            ▾
          </span>
        </button>
        {(internalPath || internalLink) && (
          <button type="button" className="pm-ils__clear" onClick={onClear} title="Clear internal target">
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="pm-ils__popover" id={listId} role="listbox" aria-labelledby={btnId} aria-activedescendant={`opt-${activeIdx}`}>
          <div className="pm-ils__search">
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search pages, collections, products…"
              aria-label="Search storefront links"
              autoComplete="off"
            />
            {loading ? <span className="pm-ils__loading">Searching…</span> : null}
          </div>
          {!q.trim() && recents.length > 0 && <div className="pm-ils__hint">Recent picks</div>}
          <ul className="pm-ils__list" role="presentation">
            {flatList.length === 0 && !loading ? (
              <li className="pm-ils__empty">No matches</li>
            ) : (
              flatList.map((row, idx) => (
                <li key={`${row.kind}:${row.slug}`} role="option" id={`opt-${idx}`} aria-selected={idx === activeIdx}>
                  <button
                    type="button"
                    className={`pm-ils__opt${idx === activeIdx ? " pm-ils__opt--active" : ""}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => applyPick(row)}
                  >
                    <span className="pm-ils__opt-title">{row.label}</span>
                    <span className="pm-ils__opt-row">
                      <span className="pm-ils__tag">{row.kind}</span>
                      <code>{row.path}</code>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
