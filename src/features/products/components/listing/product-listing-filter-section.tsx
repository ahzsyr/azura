import type { ReactNode } from "react";

type Props = {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function ProductListingFilterSection({
  title,
  count,
  defaultOpen = false,
  children,
}: Props) {
  return (
    <details className="pl-filter-section" open={defaultOpen}>
      <summary className="pl-filter-section__summary">
        <span className="pl-filter-section__title">
          {title}
          {count != null && count > 0 ? (
            <span className="pl-filter-section__badge" aria-label={`${count} selected`}>
              {count}
            </span>
          ) : null}
        </span>
        <span className="pl-filter-section__chevron" aria-hidden="true">
          ▼
        </span>
      </summary>
      <div className="pl-filter-section__body">
        <div className="pl-filter-section__body-inner">{children}</div>
      </div>
    </details>
  );
}
