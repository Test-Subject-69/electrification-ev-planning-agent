"use client";

import { BrandLogo } from "./brand-logo.jsx";

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    hint: "Map, summary, and selected site",
    icon: OverviewIcon
  },
  {
    id: "compare",
    label: "Compare",
    hint: "Side-by-side location analysis",
    icon: CompareIcon
  },
  {
    id: "assistant",
    label: "Assistant",
    hint: "Ask the EV planning AI",
    icon: AssistantIcon
  }
];

export function SideNav({ activeView, onChange, currentUserEmail, onSignOut }) {
  return (
    <nav className="side-nav" aria-label="Dashboard sections">
      <div className="side-nav-brand">
        <BrandLogo />
      </div>

      <ul className="side-nav-list">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`side-nav-link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onChange(item.id)}
              >
                <span className="side-nav-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="side-nav-copy">
                  <span className="side-nav-label">{item.label}</span>
                  <span className="side-nav-hint">{item.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="side-nav-footer">
        {currentUserEmail ? <p className="side-nav-user">{currentUserEmail}</p> : null}
        {onSignOut ? (
          <button className="side-nav-signout" type="button" onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
      </div>
    </nav>
  );
}

function OverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="16" rx="1" />
      <rect x="14" y="4" width="7" height="16" rx="1" />
    </svg>
  );
}

function AssistantIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
