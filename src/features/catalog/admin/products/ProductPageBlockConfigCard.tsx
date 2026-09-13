import type { ReactNode } from "react";

type Props = {
  title: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  preview?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function ProductPageBlockConfigCard({
  title,
  enabled,
  onEnabledChange,
  preview,
  children,
  defaultOpen = true,
}: Props) {
  return (
    <details className="apm-pe-block-card" open={defaultOpen}>
      <summary className="apm-pe-block-card__head">
        <span className="apm-pe-block-card__title">{title}</span>
        <label className="apm-pe-block-card__enabled pm-inline-check" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} />
          Enabled
        </label>
      </summary>
      <div className="apm-pe-block-card__body">
        {preview ? <div className="apm-pe-block-card__preview">{preview}</div> : null}
        {children}
      </div>
    </details>
  );
}
