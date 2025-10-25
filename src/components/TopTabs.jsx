// TopTabs.jsx
import React from "react";

// tabs: tasks | calendar | music | story | ach | journal
const TABS = [
  { key: "tasks", label: "Tasks" },
  { key: "calendar", label: "Calendar" },
  { key: "music", label: "Tavern" },
  { key: "story", label: "Story" },
  { key: "ach", label: "Achievements" },
  { key: "journal", label: "Journal" },
];

export default function TopTabs({ tab, setTab }) {
  return (
    <div
      className="top-tabs"
      role="tablist"
      aria-label="Top tabs"
      style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={tab === t.key}
          className={`tab ${tab === t.key ? "active" : ""}`}
          onClick={() => setTab(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
