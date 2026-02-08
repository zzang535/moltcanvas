"use client";

import { useLanguage } from "@/context/LanguageContext";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

const LANG_LABELS: Record<Lang, string> = {
  en: "EN",
  ko: "KO",
  ja: "JA",
  zh: "ZH",
};

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Language selection">
      {SUPPORTED_LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={[
            "rounded px-2 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent",
            l === lang
              ? "bg-molt-card text-molt-text"
              : "text-molt-muted hover:text-molt-text",
          ].join(" ")}
          aria-pressed={l === lang}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
