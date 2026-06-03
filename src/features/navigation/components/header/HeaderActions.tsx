import type { HeaderAction } from "@/features/navigation/types";
import { getActionTypeLabel } from "@/features/navigation/menu-engine";

interface Props {
  actions: HeaderAction[];
  onActionClick?: (action: HeaderAction) => void;
}

export function HeaderActions({ actions, onActionClick }: Props) {
  const visible = actions.filter((a) => a.visible !== false);

  return (
    <>
      {visible.map((action) => {
        const iconClass = action.icon || "fa-circle";
        const label = action.label || getActionTypeLabel(action.type);
        const outlined = action.outlined ? " action-pill-outlined" : "";

        if (action.style === "icon") {
          return (
            <button
              key={action.id}
              type="button"
              className="icon-btn preview-action-btn"
              data-preview-action-id={action.id}
              data-preview-action-type={action.type}
              aria-label={label}
              onClick={() => onActionClick?.(action)}
            >
              <i className={`fas ${iconClass}`} aria-hidden />
            </button>
          );
        }

        return (
          <button
            key={action.id}
            type="button"
            className={`action-pill action-pill-${action.style}${outlined} preview-action-btn`}
            data-preview-action-id={action.id}
            data-preview-action-type={action.type}
            onClick={() => onActionClick?.(action)}
          >
            <i className={`fas ${iconClass}`} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </>
  );
}
