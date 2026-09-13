import { useState } from "react";
import { copyTextToClipboard, truncateMiddle } from "./product-media-utils";

type Props = {
  dragKey: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  nameReadOnly?: boolean;
  onDragStart: (e: React.DragEvent, key: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, key: string) => void;
  preview: React.ReactNode;
  name: string;
  onNameChange: (v: string) => void;
  typeLabel: string;
  roleValue: string;
  roleOptions: { value: string; label: string }[];
  onRoleChange: (v: string) => void;
  url: string;
  onUrlChange: (v: string) => void;
  canSetMain: boolean;
  onSetMain: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  disableUp: boolean;
  disableDown: boolean;
  onOpen: () => void;
};

export function ProductMediaRow({
  dragKey,
  selected,
  onToggleSelect,
  nameReadOnly,
  onDragStart,
  onDragOver,
  onDrop,
  preview,
  name,
  onNameChange,
  typeLabel,
  roleValue,
  roleOptions,
  onRoleChange,
  url,
  onUrlChange,
  canSetMain,
  onSetMain,
  onMoveUp,
  onMoveDown,
  onDelete,
  disableUp,
  disableDown,
  onOpen,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const iconBtn =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-xs text-foreground transition hover:border-primary/45 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <tr
      draggable
      onDragStart={(e) => onDragStart(e, dragKey)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, dragKey)}
      className="border-b border-primary/10 transition-colors hover:bg-primary/[0.04]"
    >
      {onToggleSelect ? (
        <td className="w-10 px-1 py-2 align-middle">
          <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={selected} onChange={onToggleSelect} aria-label="Select row" />
        </td>
      ) : null}
      <td className="w-14 px-2 py-2 align-middle">{preview}</td>
      <td className="min-w-[120px] max-w-[200px] px-2 py-2 align-middle">
        <input
          type="text"
          readOnly={nameReadOnly}
          className={`w-full rounded-md border border-input px-2 py-1 text-xs text-foreground ${
            nameReadOnly ? "cursor-default bg-muted/30 text-muted-foreground" : "bg-background"
          }`}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Title / alt"
        />
      </td>
      <td className="whitespace-nowrap px-2 py-2 align-middle">
        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
          {typeLabel}
        </span>
      </td>
      <td className="min-w-[100px] px-2 py-2 align-middle">
        {roleOptions.length === 0 ? (
          <span className="text-[0.7rem] text-muted-foreground">—</span>
        ) : (
          <select
            className="w-full max-w-[9rem] rounded-md border border-input bg-background px-1 py-1 text-[0.7rem] text-foreground"
            value={roleValue}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="max-w-[220px] px-2 py-2 align-middle">
        <div className="flex items-center gap-1">
          <span className="truncate font-mono text-[0.65rem] text-muted-foreground" title={url}>
            {url ? truncateMiddle(url, 40) : "—"}
          </span>
          <button
            type="button"
            className={iconBtn}
            title="Copy URL"
            disabled={!url}
            onClick={async () => {
              if (!url) return;
              const ok = await copyTextToClipboard(url);
              setCopied(ok);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "✓" : "⎘"}
          </button>
          <button
            type="button"
            className={iconBtn}
            title={expanded ? "Collapse URL" : "Edit URL"}
            onClick={() => setExpanded((x) => !x)}
          >
            ✎
          </button>
        </div>
        {expanded && (
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 font-mono text-[0.65rem] text-foreground"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://…"
          />
        )}
      </td>
      <td className="whitespace-nowrap px-1 py-2 align-middle">
        <div className="flex flex-wrap items-center justify-end gap-0.5">
          {canSetMain ? (
            <button type="button" className={iconBtn} title="Set as main image" onClick={onSetMain}>
              ★
            </button>
          ) : null}
          <button type="button" className={iconBtn} title="Move up" disabled={disableUp} onClick={onMoveUp}>
            ↑
          </button>
          <button type="button" className={iconBtn} title="Move down" disabled={disableDown} onClick={onMoveDown}>
            ↓
          </button>
          <button type="button" className={iconBtn} title="Open / preview" disabled={!url} onClick={onOpen}>
            ↗
          </button>
          <button
            type="button"
            className={`${iconBtn} border-red-500/30 text-red-600 hover:bg-red-500/10`}
            title="Remove"
            onClick={onDelete}
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  );
}
