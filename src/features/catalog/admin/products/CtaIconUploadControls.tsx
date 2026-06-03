import { useId, useState } from "react";
import { PRODUCT_CTA_ICON_OPTIONS } from "@/features/products/lib/product-cta";
import { uploadCtaIconFile } from "./cta-icon-upload";

type Props = {
  /** Font Awesome class (used when no custom image URL). */
  faIcon: string;
  onFaIconChange: (v: string) => void;
  /** Public path e.g. /uploads/images/... — overrides FA when non-empty. */
  iconUrl: string;
  onIconUrlChange: (v: string) => void;
  /** When true, FA select includes "(inherit)" for per-product overrides. */
  inheritFa?: boolean;
};

export function CtaIconUploadControls({
  faIcon,
  onFaIconChange,
  iconUrl,
  onIconUrlChange,
  inheritFa = false,
}: Props) {
  const fileInputId = useId().replace(/:/g, "_");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="cta-icon-upload">
      <div className="cta-icon-upload__row pm-cta-grid pm-span-2">
        <label className="pm-cta-field pm-span-2">
          <span>Icon — Font Awesome (when no custom image)</span>
          <select
            value={inheritFa ? faIcon || "" : faIcon}
            onChange={(e) => onFaIconChange(e.target.value)}
          >
            {inheritFa ? <option value="">(inherit global)</option> : null}
            {!PRODUCT_CTA_ICON_OPTIONS.some((o) => o.value === faIcon) && faIcon ? (
              <option value={faIcon}>Custom class ({faIcon})</option>
            ) : null}
            {PRODUCT_CTA_ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="pm-cta-field pm-span-2">
          <span>Custom icon image URL (PNG or SVG)</span>
          <input
            type="text"
            value={iconUrl}
            placeholder="https://… or /uploads/images/…"
            onChange={(e) => {
              onIconUrlChange(e.target.value);
              setErr(null);
            }}
            aria-describedby={err ? "cta-icon-upload-err" : undefined}
          />
        </label>
        <div className="pm-cta-field pm-span-2 cta-icon-upload__actions">
          <input
            type="file"
            accept="image/png,image/svg+xml,.png,.svg"
            className="cta-icon-upload__file"
            id={`cta-icon-file-${fileInputId}`}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy(true);
              setErr(null);
              void uploadCtaIconFile(f)
                .then((url) => onIconUrlChange(url))
                .catch((ex: unknown) => setErr(ex instanceof Error ? ex.message : "Upload failed"))
                .finally(() => setBusy(false));
            }}
          />
          <label htmlFor={`cta-icon-file-${fileInputId}`} className="cta-icon-upload__file-label">
            {busy ? "Uploading…" : "Upload PNG / SVG"}
          </label>
          {iconUrl ? (
            <button type="button" className="pm-btn-secondary cta-icon-upload__clear" onClick={() => onIconUrlChange("")}>
              Remove custom image
            </button>
          ) : null}
        </div>
        {iconUrl ? (
          <div className="pm-cta-field pm-span-2 cta-icon-upload__preview">
            <span className="cta-icon-upload__preview-label">Preview</span>
            <img src={iconUrl} alt="" className="cta-icon-upload__thumb" width={28} height={28} />
          </div>
        ) : null}
        {err ? (
          <p id="cta-icon-upload-err" className="pm-cta-field__err pm-span-2" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </div>
  );
}
