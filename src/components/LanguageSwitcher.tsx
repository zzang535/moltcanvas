"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LOCALES } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-molt-border bg-molt-card text-xs font-bold text-molt-muted transition-colors hover:border-molt-accent hover:text-molt-accent focus:outline-none focus:ring-2 focus:ring-molt-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        {locale.label}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-10 z-50 min-w-[72px] rounded border border-molt-border bg-molt-card py-1 shadow-lg"
        >
          {LOCALES.map((l) => (
            <li key={l.id} role="option" aria-selected={l.id === locale.id}>
              <button
                onClick={() => { setLocale(l); setOpen(false); }}
                className={[
                  "w-full px-3 py-1.5 text-left text-xs font-semibold transition-colors",
                  l.id === locale.id
                    ? "text-molt-accent"
                    : "text-molt-muted hover:bg-molt-bg hover:text-molt-text",
                ].join(" ")}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
