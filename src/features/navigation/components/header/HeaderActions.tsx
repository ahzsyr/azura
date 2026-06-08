import type { HeaderAction } from "@/features/navigation/types";
import { getActionTypeLabel } from "@/features/navigation/menu-engine";
import { resolveActionHref } from "@/features/navigation/resolve-href";

interface Props {
  actions: HeaderAction[];
  localeCode?: string;
  onActionClick?: (action: HeaderAction) => void;
}

export function HeaderActions({ actions, localeCode, onActionClick }: Props) {
  const visible = actions.filter((a) => a.visible !== false);

  return (
    <>
      {visible.map((action) => {
        const iconClass = action.icon || "fa-circle";
        const label = action.label || getActionTypeLabel(action.type);
        const outlined = action.outlined ? " action-pill-outlined" : "";
        const href = resolveActionHref(action, localeCode);
        const isCustomLink = action.type === "custom" && href;

        const handleClick = () => onActionClick?.(action);

        if (action.style === "icon") {
          if (isCustomLink) {
            return (
              <a
                key={action.id}
                href={href}
                className="icon-btn preview-action-btn"
                data-preview-action-id={action.id}
                data-preview-action-type={action.type}
                aria-label={label}
                onClick={handleClick}
              >
                <i className={`fas ${iconClass}`} aria-hidden />
              </a>
            );
          }
          return (
            <button
              key={action.id}
              type="button"
              className="icon-btn preview-action-btn"
              data-preview-action-id={action.id}
              data-preview-action-type={action.type}
              aria-label={label}
              onClick={handleClick}
            >
              <i className={`fas ${iconClass}`} aria-hidden />
            </button>
          );
        }

        if (isCustomLink) {
          return (
            <a
              key={action.id}
              href={href}
              className={`action-pill action-pill-${action.style}${outlined} preview-action-btn`}
              data-preview-action-id={action.id}
              data-preview-action-type={action.type}
              onClick={handleClick}
            >
              <i className={`fas ${iconClass}`} aria-hidden />
              <span>{label}</span>
            </a>
          );
        }

        return (
          <button
            key={action.id}
            type="button"
            className={`action-pill action-pill-${action.style}${outlined} preview-action-btn`}
            data-preview-action-id={action.id}
            data-preview-action-type={action.type}
            onClick={handleClick}
          >
            <i className={`fas ${iconClass}`} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </>
  );
}
