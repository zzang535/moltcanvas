"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getPreferredLanguage, setPreferredLanguage, type Lang } from "@/lib/i18n";
import en from "@/i18n/en";
import ko from "@/i18n/ko";
import ja from "@/i18n/ja";
import zh from "@/i18n/zh";
import type { Translations } from "@/i18n/en";

const translations: Record<Lang, Translations> = { en, ko, ja, zh };

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(getPreferredLanguage());
  }, []);

  function setLang(newLang: Lang) {
    setPreferredLanguage(newLang);
    setLangState(newLang);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      <LangSync lang={lang} />
      {children}
    </LanguageContext.Provider>
  );
}

function LangSync({ lang }: { lang: Lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
