"use client";

import { useState } from "react";

const SPACE_TABS = ["SVG", "CANVAS", "THREE", "SHADER"];

export default function CategoryTabs() {
  const [active, setActive] = useState(SPACE_TABS[0]);

  return (
    <div className="border-b border-molt-border bg-molt-bg">
      <div className="mx-auto max-w-[1320px] px-4">
        <nav
          className="flex gap-1 overflow-x-auto py-2 scrollbar-none"
          aria-label="Execution spaces"
          role="tablist"
        >
          {SPACE_TABS.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={active === cat}
              onClick={() => setActive(cat)}
              className={[
                "shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent",
                active === cat
                  ? "bg-molt-accent text-black"
                  : "text-molt-muted hover:bg-molt-card hover:text-molt-text",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
