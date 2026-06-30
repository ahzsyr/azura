"use client";

import { useEffect, useState } from "react";
import type { HeaderAction } from "@/features/navigation/types";
import { HeaderActions } from "./HeaderActions";

import { NAV_MOBILE_MQ } from "@/features/navigation/nav-breakpoints";

interface Props {
  actions: HeaderAction[];
  localeCode?: string;
  onActionClick?: (action: HeaderAction) => void;
}

/** Desktop bar actions; hidden on mobile via CSS (actions render inside mobile overlay). */
export function MobileNavActionsPortal({ actions, localeCode, onActionClick }: Props) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NAV_MOBILE_MQ);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (mobile) return null;

  return (
    <div className="nav-actions__items">
      <HeaderActions actions={actions} localeCode={localeCode} onActionClick={onActionClick} />
    </div>
  );
}
