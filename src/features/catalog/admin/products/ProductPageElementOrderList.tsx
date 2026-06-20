import type { KeyboardEvent } from "react";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import { PRODUCT_PAGE_ELEMENT_LABELS } from "@/features/products/lib/product-page-display";

type Props = {
  title: string;
  description?: string;
  keys: readonly string[];
  order: string[];
  display: ResolvedProductPageDisplay;
  onOrderChange: (order: string[]) => void;
  onToggle: (key: keyof ResolvedProductPageDisplay, enabled: boolean) => void;
};

export function ProductPageElementOrderList({
  title,
  description,
  keys,
  order,
  display,
  onOrderChange,
  onToggle,
}: Props) {
  const ordered = order.filter((k) => keys.includes(k));
  for (const k of keys) {
    if (!ordered.includes(k)) ordered.push(k);
  }

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onOrderChange(next);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLLIElement>, idx: number) => {
    if ((event.altKey || event.ctrlKey) && event.key === "ArrowUp") {
      event.preventDefault();
      move(idx, -1);
    }
    if ((event.altKey || event.ctrlKey) && event.key === "ArrowDown") {
      event.preventDefault();
      move(idx, 1);
    }
  };

  return (
    <section className="apm-pe-zone">
      <header className="apm-pe-zone__head">
        <h3 className="apm-pe-zone__title">{title}</h3>
        {description ? <p className="apm-pe-zone__desc">{description}</p> : null}
      </header>
      <ol className="apm-pe-order-list">
        {ordered.map((key, idx) => {
          const displayKey = key as keyof ResolvedProductPageDisplay;
          const enabled = display[displayKey]?.enabled !== false;
          const label = PRODUCT_PAGE_ELEMENT_LABELS[displayKey] ?? key;
          return (
            <li
              key={key}
              className="apm-pe-order-row"
              tabIndex={0}
              onKeyDown={(event) => handleRowKeyDown(event, idx)}
            >
              <span className="apm-pe-order-row__handle" aria-hidden="true">
                ⋮⋮
              </span>
              <span className="apm-pe-order-row__label">{label}</span>
              <label className="apm-pe-order-row__toggle pm-inline-check">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onToggle(displayKey, e.target.checked)}
                />
                <span className="sr-only">Show {label}</span>
              </label>
              <div className="apm-pe-order-row__actions">
                <button
                  type="button"
                  className="apm-pe-order-row__btn"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label={`Move ${label} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="apm-pe-order-row__btn"
                  disabled={idx === ordered.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label={`Move ${label} down`}
                >
                  ↓
                </button>
              </div>
              <span className="sr-only">Use Alt+ArrowUp/ArrowDown to reorder</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
