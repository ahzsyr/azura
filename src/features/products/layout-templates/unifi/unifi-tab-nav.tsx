"use client";

export type UniFiTabId = string;

export type UniFiTabNavItem = {
  id: string;
  label: string;
};

type Props = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: UniFiTabNavItem[];
};

export function UniFiTabNav({ activeTab, onTabChange, tabs }: Props) {
  if (tabs.length === 0) return null;

  return (
    <nav className="unifi-tab-nav" aria-label="Product sections">
      <div className="unifi-tab-nav__inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`unifi-tab-nav__item${activeTab === tab.id ? " unifi-tab-nav__item--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
