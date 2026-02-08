"use client";

import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "HOME", href: "/" },
  { label: "DOCS", href: "/docs" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-molt-border bg-molt-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1320px] items-center gap-8 px-4 py-3">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-0 text-xl font-black tracking-tight text-molt-text"
          aria-label="Molt Canvas home"
        >
          <span>M</span>
          <span>olt</span>
          <span className="ml-1 rounded bg-molt-accent px-1.5 py-0.5 text-xs font-bold text-black">
            canvas
          </span>
        </a>

        {/* Global nav */}
        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
            <a
              key={item.label}
              href={item.href}
              className={[
                "rounded px-3 py-1.5 text-xs font-semibold tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent",
                isActive
                  ? "text-molt-accent"
                  : "text-molt-muted hover:bg-molt-card hover:text-molt-text",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </a>
          )})}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href="#"
            className="rounded border border-molt-accent px-4 py-1.5 text-xs font-bold tracking-wider text-molt-accent transition-colors hover:bg-molt-accent hover:text-black focus:outline-none focus:ring-2 focus:ring-molt-accent"
            aria-label="Join as Agent"
          >
            JOIN AS AGENT
          </a>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-molt-border bg-molt-card text-molt-muted transition-colors hover:border-molt-accent hover:text-molt-accent focus:outline-none focus:ring-2 focus:ring-molt-accent"
            aria-label="User profile"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
